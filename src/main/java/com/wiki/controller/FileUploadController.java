package com.wiki.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import jakarta.servlet.http.HttpServletRequest;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

/**
 * 파일 업로드 컨트롤러
 * 
 * 단일 책임 원칙에 따라 파일 업로드 관련 기능만을 담당합니다.
 * 이미지 파일 업로드 및 저장 경로 관리를 제공합니다.
 */
@RestController
@RequestMapping("/api/files")
public class FileUploadController {

    @Value("${app.file.upload-dir:uploads}")
    private String uploadDir;

    /**
     * 이미지 파일 업로드
     * 
     * @param file 업로드할 이미지 파일
     * @param request HTTP 요청 객체
     * @return 업로드 결과 정보
     */
    @PostMapping("/images")
    public ResponseEntity<FileUploadResponse> uploadImage(
            @RequestParam("file") MultipartFile file,
            HttpServletRequest request) {
        
        try {
            // 파일 검증
            if (file.isEmpty()) {
                return ResponseEntity.badRequest()
                    .body(new FileUploadResponse(false, "파일이 선택되지 않았습니다.", null, null));
            }

            // 이미지 파일 형식 검증
            String contentType = file.getContentType();
            if (contentType == null || !contentType.startsWith("image/")) {
                return ResponseEntity.badRequest()
                    .body(new FileUploadResponse(false, "이미지 파일만 업로드 가능합니다.", null, null));
            }

            // 파일 크기 검증 (10MB 제한)
            if (file.getSize() > 10 * 1024 * 1024) {
                return ResponseEntity.badRequest()
                    .body(new FileUploadResponse(false, "파일 크기는 10MB를 초과할 수 없습니다.", null, null));
            }

            // 업로드 디렉토리 생성
            Path uploadPath = Paths.get(uploadDir);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            // 날짜별 하위 디렉토리 생성
            String dateFolder = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy/MM/dd"));
            Path datePath = uploadPath.resolve(dateFolder);
            if (!Files.exists(datePath)) {
                Files.createDirectories(datePath);
            }

            // 고유한 파일명 생성
            String originalFilename = file.getOriginalFilename();
            String fileExtension = "";
            if (originalFilename != null && originalFilename.contains(".")) {
                fileExtension = originalFilename.substring(originalFilename.lastIndexOf("."));
            }
            
            String uniqueFilename = UUID.randomUUID().toString() + fileExtension;
            Path filePath = datePath.resolve(uniqueFilename);

            // 파일 저장
            Files.copy(file.getInputStream(), filePath);

            // 웹 접근 경로 생성
            String webPath = "/api/files/images/" + dateFolder + "/" + uniqueFilename;
            
            return ResponseEntity.ok(new FileUploadResponse(
                true, 
                "파일이 성공적으로 업로드되었습니다.", 
                webPath,
                originalFilename
            ));

        } catch (IOException e) {
            return ResponseEntity.internalServerError()
                .body(new FileUploadResponse(false, "파일 업로드 중 오류가 발생했습니다: " + e.getMessage(), null, null));
        }
    }

    /**
     * 파일 업로드 응답 DTO
     */
    public static class FileUploadResponse {
        private boolean success;
        private String message;
        private String filePath;
        private String originalName;

        public FileUploadResponse(boolean success, String message, String filePath, String originalName) {
            this.success = success;
            this.message = message;
            this.filePath = filePath;
            this.originalName = originalName;
        }

        // Getters and Setters
        public boolean isSuccess() {
            return success;
        }

        public void setSuccess(boolean success) {
            this.success = success;
        }

        public String getMessage() {
            return message;
        }

        public void setMessage(String message) {
            this.message = message;
        }

        public String getFilePath() {
            return filePath;
        }

        public void setFilePath(String filePath) {
            this.filePath = filePath;
        }

        public String getOriginalName() {
            return originalName;
        }

        public void setOriginalName(String originalName) {
            this.originalName = originalName;
        }
    }
} 