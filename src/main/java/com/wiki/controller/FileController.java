package com.wiki.controller;

import com.wiki.dto.FileAttachmentDto;
import com.wiki.service.FileService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import jakarta.servlet.http.HttpServletRequest;
import java.util.List;

/**
 * File Controller
 * 파일 업로드/다운로드 관련 REST API를 제공합니다.
 * CORS를 통해 프론트엔드와의 통신을 허용합니다.
 */
@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
public class FileController {
    
    private final FileService fileService;
    
    @Value("${app.server.host}")
    private String serverHost;
    
    @Value("${app.cors.allowed-origins}")
    private String allowedOrigins;
    
    /**
     * API 테스트용 엔드포인트
     */
    @GetMapping("/test")
    public ResponseEntity<String> testApi() {
        try {
            System.out.println("Test API 호출됨");
            return ResponseEntity.ok("File API is working!");
        } catch (Exception e) {
            System.err.println("Test API 오류: " + e.getMessage());
            e.printStackTrace();
            throw e;
        }
    }
    
    /**
     * 매우 간단한 테스트 엔드포인트 (의존성 없음)
     */
    @GetMapping("/simple-test")
    public String simpleTest() {
        System.out.println("Simple test API 호출됨");
        return "Simple test working!";
    }
    
    /**
     * 파일을 업로드합니다. (제목 기반)
     * 
     * @param pageTitle 페이지 제목
     * @param file 업로드할 파일
     * @param customFileName 사용자 지정 파일명 (선택사항)
     * @return 업로드된 파일 정보
     */
    @PostMapping("/upload")
    public ResponseEntity<FileAttachmentDto.Response> uploadFile(
            @RequestParam("pageTitle") String pageTitle,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "customFileName", defaultValue = "") String customFileName) {
        
        System.out.println("파일 업로드 요청 - pageTitle: " + pageTitle + ", fileName: " + file.getOriginalFilename() + ", customFileName: " + customFileName);
        
        if (file.isEmpty()) {
            System.out.println("파일이 비어있음");
            return ResponseEntity.badRequest().build();
        }
        
        try {
            FileAttachmentDto.Response response = fileService.uploadFile(pageTitle, file, customFileName);
            System.out.println("파일 업로드 성공: " + response.getOriginalFileName());
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (Exception e) {
            System.err.println("파일 업로드 실패: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * 파일을 업로드합니다. (ID 기반)
     * 
     * @param pageId 페이지 ID
     * @param file 업로드할 파일
     * @param customFileName 사용자 지정 파일명 (선택사항)
     * @return 업로드된 파일 정보
     */
    @PostMapping("/upload/page/{pageId}")
    public ResponseEntity<FileAttachmentDto.Response> uploadFileByPageId(
            @PathVariable Long pageId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "customFileName", defaultValue = "") String customFileName,
            HttpServletRequest request) {
        
        System.out.println("파일 업로드 요청 (ID 기반) - pageId: " + pageId + ", fileName: " + file.getOriginalFilename() + ", customFileName: " + customFileName);
        System.out.println("Session ID: " + request.getSession().getId());
        
        if (file.isEmpty()) {
            System.out.println("파일이 비어있음");
            return ResponseEntity.badRequest().build();
        }
        
        try {
            FileAttachmentDto.Response response = fileService.uploadFileByPageId(pageId, file, customFileName);
            System.out.println("파일 업로드 성공: " + response.getOriginalFileName());
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (Exception e) {
            System.err.println("파일 업로드 실패: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    /**
     * 특정 페이지의 모든 첨부 파일을 조회합니다. (제목 기반)
     * 
     * @param pageTitle 페이지 제목
     * @return 첨부 파일 목록
     */
    @GetMapping
    public ResponseEntity<List<FileAttachmentDto.Response>> getFilesByPage(
            @RequestParam String pageTitle) {
        try {
            System.out.println("파일 목록 요청 - pageTitle: " + pageTitle);
            List<FileAttachmentDto.Response> files = fileService.getFilesByPageTitle(pageTitle);
            System.out.println("파일 목록 조회 성공: " + files.size() + "개");
            return ResponseEntity.ok(files);
        } catch (Exception e) {
            System.err.println("파일 목록 조회 실패: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * 특정 페이지의 모든 첨부 파일을 조회합니다. (ID 기반)
     * 
     * @param pageId 페이지 ID
     * @return 첨부 파일 목록
     */
    @GetMapping("/page/{pageId}")
    public ResponseEntity<List<FileAttachmentDto.Response>> getFilesByPageId(
            @PathVariable Long pageId,
            HttpServletRequest request) {
        try {
            System.out.println("파일 목록 요청 (ID 기반) - pageId: " + pageId);
            System.out.println("Session ID: " + request.getSession().getId());
            List<FileAttachmentDto.Response> files = fileService.getFilesByPageId(pageId);
            System.out.println("파일 목록 조회 성공: " + files.size() + "개");
            return ResponseEntity.ok(files);
        } catch (Exception e) {
            System.err.println("파일 목록 조회 실패: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    /**
     * 파일을 다운로드합니다.
     * 
     * @param storedFileName 저장된 파일명
     * @return 파일 리소스
     */
    @GetMapping("/download/{storedFileName}")
    public ResponseEntity<Resource> downloadFile(@PathVariable String storedFileName) {
        System.out.println("파일 다운로드 요청: " + storedFileName);
        try {
            // 파일 정보 조회
            FileAttachmentDto.Response fileInfo = fileService.getFileInfo(storedFileName);
            System.out.println("파일 정보 조회 성공: " + fileInfo.getOriginalFileName());
            
            // 파일 리소스 조회
            Resource resource = fileService.downloadFile(storedFileName);
            System.out.println("파일 리소스 조회 성공");
            
            // 파일 다운로드 응답 헤더 설정
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(fileInfo.getContentType()))
                    .header(HttpHeaders.CONTENT_DISPOSITION, 
                            "attachment; filename=\"" + fileInfo.getOriginalFileName() + "\"")
                    .body(resource);
        } catch (Exception e) {
            System.err.println("파일 다운로드 실패: " + storedFileName + " - " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.notFound().build();
        }
    }
    
    /**
     * 파일을 삭제합니다.
     * 
     * @param fileId 파일 ID
     * @return 삭제 완료 응답
     */
    @DeleteMapping("/{fileId}")
    public ResponseEntity<Void> deleteFile(@PathVariable Long fileId) {
        try {
            fileService.deleteFile(fileId);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }
    
    /**
     * 파일 정보를 조회합니다.
     * 
     * @param storedFileName 저장된 파일명
     * @return 파일 정보
     */
    @GetMapping("/info/{storedFileName}")
    public ResponseEntity<FileAttachmentDto.Response> getFileInfo(@PathVariable String storedFileName) {
        try {
            FileAttachmentDto.Response fileInfo = fileService.getFileInfo(storedFileName);
            return ResponseEntity.ok(fileInfo);
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }
    
    /**
     * 이미지 파일을 업로드합니다.
     * 클립보드 붙여넣기나 이미지 업로드 버튼에서 사용됩니다.
     * 
     * @param file 업로드할 이미지 파일
     * @return 업로드된 이미지 URL 정보
     */
    @PostMapping("/images")
    public ResponseEntity<?> uploadImage(@RequestParam("file") MultipartFile file) {
        System.out.println("이미지 업로드 요청 - fileName: " + file.getOriginalFilename());
        
        if (file.isEmpty()) {
            System.out.println("파일이 비어있음");
            return ResponseEntity.badRequest().body(new ImageUploadResponse(false, "파일이 비어있습니다", null, null));
        }
        
        // 이미지 파일 검증
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            System.out.println("이미지 파일이 아님: " + contentType);
            return ResponseEntity.badRequest().body(new ImageUploadResponse(false, "이미지 파일만 업로드 가능합니다", null, null));
        }
        
        try {
            // 임시 페이지 ID 사용 (이미지 업로드는 페이지와 독립적으로 처리)
            FileAttachmentDto.Response response = fileService.uploadImageFile(file);
            
            // 이미지 URL 생성
            String imageUrl = serverHost + "/api/files/download/" + response.getStoredFileName();
            System.out.println("이미지 업로드 성공: " + imageUrl);
            
            return ResponseEntity.ok(new ImageUploadResponse(true, "이미지 업로드 성공", imageUrl, response.getOriginalFileName()));
        } catch (Exception e) {
            System.err.println("이미지 업로드 실패: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ImageUploadResponse(false, "이미지 업로드 중 오류가 발생했습니다: " + e.getMessage(), null, null));
        }
    }
    
    /**
     * 이미지 업로드 응답 DTO
     */
    @lombok.Data
    @lombok.AllArgsConstructor
    private static class ImageUploadResponse {
        private boolean success;
        private String message;
        private String filePath;
        private String originalName;
    }
    
    /**
     * 기존 파일들을 페이지별 폴더 구조로 마이그레이션합니다.
     * 한 번만 실행하면 되는 관리용 API입니다.
     * 
     * @return 마이그레이션 완료 메시지
     */
    @PostMapping("/migrate-to-page-folders")
    public ResponseEntity<String> migrateFilesToPageFolders() {
        try {
            System.out.println("파일 마이그레이션 시작...");
            fileService.migrateFilesToPageFolders();
            String message = "파일 마이그레이션이 완료되었습니다. 모든 파일이 페이지별 폴더로 이동되었습니다.";
            System.out.println(message);
            return ResponseEntity.ok(message);
        } catch (Exception e) {
            System.err.println("파일 마이그레이션 실패: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("파일 마이그레이션 중 오류가 발생했습니다: " + e.getMessage());
        }
    }
} 