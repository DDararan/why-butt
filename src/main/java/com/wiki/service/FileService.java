package com.wiki.service;

import com.wiki.dto.FileAttachmentDto;
import com.wiki.entity.FileAttachment;
import com.wiki.entity.WikiPage;
import com.wiki.exception.ResourceNotFoundException;
import com.wiki.repository.FileAttachmentRepository;
import com.wiki.repository.WikiPageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * File Service
 * 파일 업로드/다운로드 관련 비즈니스 로직을 처리합니다.
 * SOLID 원칙을 준수하여 파일 관리 책임만을 담당합니다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FileService {
    
    private final FileAttachmentRepository fileAttachmentRepository;
    private final WikiPageRepository wikiPageRepository;
    
    @Value("${app.upload.dir:uploads}")
    private String uploadDir;
    
    /**
     * 파일을 업로드하고 데이터베이스에 정보를 저장합니다. (제목 기반)
     * 페이지별로 폴더를 생성하여 파일을 분리 저장합니다.
     */
    @Transactional
    public FileAttachmentDto.Response uploadFile(String pageTitle, MultipartFile file, String customFileName) {
        WikiPage wikiPage = wikiPageRepository.findByTitle(pageTitle)
                .orElseThrow(() -> new ResourceNotFoundException("페이지를 찾을 수 없습니다: " + pageTitle));
        
        return uploadFileInternal(wikiPage, file, customFileName);
    }

    /**
     * 파일을 업로드하고 데이터베이스에 정보를 저장합니다. (ID 기반)
     * 페이지별로 폴더를 생성하여 파일을 분리 저장합니다.
     */
    @Transactional
    public FileAttachmentDto.Response uploadFileByPageId(Long pageId, MultipartFile file, String customFileName) {
        WikiPage wikiPage = wikiPageRepository.findById(pageId)
                .orElseThrow(() -> new ResourceNotFoundException("페이지를 찾을 수 없습니다: " + pageId));
        
        return uploadFileInternal(wikiPage, file, customFileName);
    }

    /**
     * 실제 파일 업로드 로직을 처리하는 내부 메서드
     */
    private FileAttachmentDto.Response uploadFileInternal(WikiPage wikiPage, MultipartFile file, String customFileName) {
        // 페이지별 파일 저장 디렉토리 생성
        String cleanUploadDir = uploadDir.trim(); // 혹시 모를 공백 제거
        String sanitizedPageTitle = sanitizeFileName(wikiPage.getTitle()); // 파일시스템에 안전한 폴더명으로 변환
        Path baseUploadPath = Paths.get(cleanUploadDir);
        Path pageUploadPath = baseUploadPath.resolve(sanitizedPageTitle);
        
        try {
            if (!Files.exists(pageUploadPath)) {
                Files.createDirectories(pageUploadPath);
            }
        } catch (IOException e) {
            throw new RuntimeException("페이지별 파일 저장 디렉토리 생성에 실패했습니다: " + sanitizedPageTitle, e);
        }
        
        // 파일명 결정 (사용자가 지정한 파일명 또는 원본 파일명)
        String originalFileName = file.getOriginalFilename();
        String targetFileName = customFileName.trim().isEmpty() ? originalFileName : customFileName;
        
        // 파일 확장자 처리
        String fileExtension = "";
        if (originalFileName != null && originalFileName.contains(".")) {
            fileExtension = originalFileName.substring(originalFileName.lastIndexOf("."));
        }
        
        // 사용자 지정 파일명에 확장자가 없으면 원본 확장자 추가
        if (!customFileName.trim().isEmpty() && !customFileName.contains(".") && !fileExtension.isEmpty()) {
            targetFileName = customFileName + fileExtension;
        }
        
        // 동일한 파일명이 있는지 확인하고 중복 방지
        String finalFileName = getUniqueFileName(targetFileName, pageUploadPath);
        
        // 파일 저장
        Path filePath = pageUploadPath.resolve(finalFileName);
        try {
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new RuntimeException("파일 저장에 실패했습니다", e);
        }
        
        // 데이터베이스에 파일 정보 저장
        FileAttachment fileAttachment = new FileAttachment();
        fileAttachment.setOriginalFileName(targetFileName);
        fileAttachment.setStoredFileName(finalFileName);
        fileAttachment.setFilePath(filePath.toString());
        fileAttachment.setFileSize(file.getSize());
        fileAttachment.setContentType(file.getContentType());
        fileAttachment.setUploadedBy("시스템"); // 기본값으로 설정
        fileAttachment.setWikiPage(wikiPage);
        
        FileAttachment savedFile = fileAttachmentRepository.save(fileAttachment);
        return convertToDto(savedFile);
    }
    
    /**
     * 파일명을 파일시스템에 안전한 형태로 변환합니다.
     * 특수문자를 제거하고 공백을 언더스코어로 변환합니다.
     */
    private String sanitizeFileName(String fileName) {
        if (fileName == null || fileName.trim().isEmpty()) {
            return "default";
        }
        
        // 파일시스템에서 사용할 수 없는 문자들을 제거 또는 변환
        return fileName.trim()
                .replaceAll("[\\\\/:*?\"<>|]", "") // Windows/Linux에서 금지된 문자 제거
                .replaceAll("\\s+", "_") // 공백을 언더스코어로 변환
                .replaceAll("[.]+$", "") // 끝의 점들 제거
                .replaceAll("^[.]+", "") // 시작의 점들 제거
                .toLowerCase(); // 소문자로 변환
    }
    
    /**
     * 중복되지 않는 고유한 파일명을 생성합니다.
     */
    private String getUniqueFileName(String fileName, Path uploadPath) {
        String baseName = fileName;
        String extension = "";
        
        if (fileName.contains(".")) {
            int lastDotIndex = fileName.lastIndexOf(".");
            baseName = fileName.substring(0, lastDotIndex);
            extension = fileName.substring(lastDotIndex);
        }
        
        String uniqueFileName = fileName;
        int counter = 1;
        
        while (Files.exists(uploadPath.resolve(uniqueFileName))) {
            uniqueFileName = baseName + "_" + counter + extension;
            counter++;
        }
        
        return uniqueFileName;
    }
    
    /**
     * 특정 페이지의 모든 첨부 파일을 조회합니다. (제목 기반)
     */
    public List<FileAttachmentDto.Response> getFilesByPageTitle(String pageTitle) {
        WikiPage wikiPage = wikiPageRepository.findByTitle(pageTitle)
                .orElseThrow(() -> new ResourceNotFoundException("페이지를 찾을 수 없습니다: " + pageTitle));
        
        List<FileAttachment> files = fileAttachmentRepository.findByWikiPageOrderByUploadedAtDesc(wikiPage);
        
        return files.stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    /**
     * 특정 페이지의 모든 첨부 파일을 조회합니다. (ID 기반)
     */
    public List<FileAttachmentDto.Response> getFilesByPageId(Long pageId) {
        WikiPage wikiPage = wikiPageRepository.findById(pageId)
                .orElseThrow(() -> new ResourceNotFoundException("페이지를 찾을 수 없습니다: " + pageId));
        
        List<FileAttachment> files = fileAttachmentRepository.findByWikiPageOrderByUploadedAtDesc(wikiPage);
        
        return files.stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }
    
    /**
     * 파일을 다운로드합니다.
     * 기존 파일 구조와 새로운 페이지별 폴더 구조를 모두 지원합니다.
     */
    public Resource downloadFile(String storedFileName) {
        FileAttachment fileAttachment = fileAttachmentRepository.findByStoredFileName(storedFileName)
                .orElseThrow(() -> new ResourceNotFoundException("파일을 찾을 수 없습니다: " + storedFileName));
        
        try {
            // 먼저 DB에 저장된 경로를 시도
            Path filePath = Paths.get(fileAttachment.getFilePath());
            Resource resource = new UrlResource(filePath.toUri());
            
            if (resource.exists() && resource.isReadable()) {
                return resource;
            }
            
            // DB 경로에 파일이 없으면 새로운 페이지별 폴더 구조에서 찾기
            String sanitizedPageTitle = sanitizeFileName(fileAttachment.getWikiPage().getTitle());
            Path newFilePath = Paths.get(uploadDir.trim(), sanitizedPageTitle, storedFileName);
            resource = new UrlResource(newFilePath.toUri());
            
            if (resource.exists() && resource.isReadable()) {
                // 새 경로에서 찾았으면 DB 업데이트
                fileAttachment.setFilePath(newFilePath.toString());
                fileAttachmentRepository.save(fileAttachment);
                return resource;
            }
            
            // 마지막으로 기존 uploads 루트에서 찾기 (하위 호환성)
            Path legacyFilePath = Paths.get(uploadDir.trim(), storedFileName);
            resource = new UrlResource(legacyFilePath.toUri());
            
            if (resource.exists() && resource.isReadable()) {
                return resource;
            }
            
            throw new ResourceNotFoundException("파일을 읽을 수 없습니다: " + storedFileName);
            
        } catch (MalformedURLException e) {
            throw new RuntimeException("파일 경로가 올바르지 않습니다", e);
        }
    }
    
    /**
     * 파일을 삭제합니다.
     */
    @Transactional
    public void deleteFile(Long fileId) {
        FileAttachment fileAttachment = fileAttachmentRepository.findById(fileId)
                .orElseThrow(() -> new ResourceNotFoundException("파일을 찾을 수 없습니다: " + fileId));
        
        // 실제 파일 삭제
        try {
            Path filePath = Paths.get(fileAttachment.getFilePath());
            Files.deleteIfExists(filePath);
        } catch (IOException e) {
            // 파일 삭제 실패해도 DB 레코드는 삭제하고 로그만 남김
            System.err.println("파일 삭제 실패: " + fileAttachment.getFilePath() + " - " + e.getMessage());
        }
        
        // 데이터베이스 레코드 삭제
        fileAttachmentRepository.delete(fileAttachment);
    }
    
    /**
     * 파일 정보를 조회합니다.
     */
    public FileAttachmentDto.Response getFileInfo(String storedFileName) {
        FileAttachment fileAttachment = fileAttachmentRepository.findByStoredFileName(storedFileName)
                .orElseThrow(() -> new ResourceNotFoundException("파일을 찾을 수 없습니다: " + storedFileName));
        
        return convertToDto(fileAttachment);
    }
    
    /**
     * 이미지 파일을 업로드합니다.
     * 페이지와 독립적으로 이미지를 저장하며, 나중에 연결할 수 있습니다.
     */
    @Transactional
    public FileAttachmentDto.Response uploadImageFile(MultipartFile file) {
        // 이미지 전용 폴더 생성
        Path imagesPath = Paths.get(uploadDir.trim(), "images");
        try {
            Files.createDirectories(imagesPath);
        } catch (IOException e) {
            throw new RuntimeException("이미지 폴더 생성에 실패했습니다", e);
        }
        
        // 고유한 파일명 생성
        String originalFileName = file.getOriginalFilename();
        if (originalFileName == null) {
            originalFileName = "image";
        }
        
        String extension = "";
        if (originalFileName.contains(".")) {
            int lastDotIndex = originalFileName.lastIndexOf(".");
            extension = originalFileName.substring(lastDotIndex);
        }
        
        // UUID를 사용한 고유한 파일명
        String storedFileName = UUID.randomUUID().toString() + extension;
        
        // 파일 저장
        Path filePath = imagesPath.resolve(storedFileName);
        try {
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new RuntimeException("이미지 파일 저장에 실패했습니다", e);
        }
        
        // 데이터베이스에 파일 정보 저장 (페이지 연결 없이)
        FileAttachment fileAttachment = new FileAttachment();
        fileAttachment.setOriginalFileName(originalFileName);
        fileAttachment.setStoredFileName(storedFileName);
        fileAttachment.setFilePath(filePath.toString());
        fileAttachment.setFileSize(file.getSize());
        fileAttachment.setContentType(file.getContentType());
        fileAttachment.setUploadedBy("시스템");
        // wikiPage는 null로 둠 (나중에 연결 가능)
        
        FileAttachment savedFile = fileAttachmentRepository.save(fileAttachment);
        
        // 페이지가 없는 경우를 위한 특별한 DTO 생성
        return new FileAttachmentDto.Response(
                savedFile.getId(),
                savedFile.getOriginalFileName(),
                savedFile.getStoredFileName(),
                savedFile.getFileSize(),
                savedFile.getContentType(),
                savedFile.getUploadedBy(),
                null, // pageTitle은 null
                savedFile.getUploadedAt()
        );
    }
    
    /**
     * 기존 파일들을 페이지별 폴더 구조로 마이그레이션합니다.
     * 한 번만 실행하면 되는 마이그레이션 메서드입니다.
     */
    @Transactional
    public void migrateFilesToPageFolders() {
        List<FileAttachment> allFiles = fileAttachmentRepository.findAll();
        
        for (FileAttachment file : allFiles) {
            try {
                Path currentPath = Paths.get(file.getFilePath());
                
                // 이미 페이지별 폴더에 있는지 확인
                if (currentPath.getParent().getFileName().toString().equals(uploadDir.trim())) {
                    // 루트 uploads 폴더에 있는 파일만 이동
                    String sanitizedPageTitle = sanitizeFileName(file.getWikiPage().getTitle());
                    Path pageFolder = Paths.get(uploadDir.trim(), sanitizedPageTitle);
                    Path newPath = pageFolder.resolve(file.getStoredFileName());
                    
                    // 페이지 폴더 생성
                    Files.createDirectories(pageFolder);
                    
                    // 파일 이동
                    if (Files.exists(currentPath)) {
                        Files.move(currentPath, newPath, StandardCopyOption.REPLACE_EXISTING);
                        
                        // DB 경로 업데이트
                        file.setFilePath(newPath.toString());
                        fileAttachmentRepository.save(file);
                        
                        System.out.println("파일 이동 완료: " + currentPath + " -> " + newPath);
                    }
                }
            } catch (IOException e) {
                System.err.println("파일 마이그레이션 실패: " + file.getStoredFileName() + " - " + e.getMessage());
            }
        }
    }
    
    /**
     * FileAttachment 엔티티를 응답 DTO로 변환합니다.
     */
    private FileAttachmentDto.Response convertToDto(FileAttachment fileAttachment) {
        return new FileAttachmentDto.Response(
                fileAttachment.getId(),
                fileAttachment.getOriginalFileName(),
                fileAttachment.getStoredFileName(),
                fileAttachment.getFileSize(),
                fileAttachment.getContentType(),
                fileAttachment.getUploadedBy(),
                fileAttachment.getWikiPage().getTitle(),
                fileAttachment.getUploadedAt()
        );
    }
} 