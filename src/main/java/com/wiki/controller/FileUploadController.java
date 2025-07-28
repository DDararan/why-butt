package com.wiki.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * 파일 업로드 컨트롤러
 * 
 * 단일 책임 원칙에 따라 파일 업로드 관련 기능만을 담당합니다.
 * 이미지 파일 업로드 및 저장 경로 관리를 제공합니다.
 */
@RestController
@RequestMapping("/api")
public class FileUploadController {

    @Value("${file.upload.path:uploads}")
    private String uploadPath;

    /**
     * 파일 업로드
     * 
     * @param file 업로드할 파일
     * @return 업로드 결과 정보
     */
    @PostMapping("/upload")
    public ResponseEntity<?> uploadFile(@RequestParam("file") MultipartFile file) {
        try {
            // 업로드 디렉토리가 없으면 생성
            Path uploadDir = Paths.get(uploadPath);
            if (!Files.exists(uploadDir)) {
                Files.createDirectories(uploadDir);
            }

            // 파일 확장자 추출
            String originalFilename = file.getOriginalFilename();
            String extension = originalFilename.substring(originalFilename.lastIndexOf("."));
            
            // 고유한 파일명 생성
            String filename = UUID.randomUUID().toString() + extension;
            
            // 파일 저장
            Path filePath = uploadDir.resolve(filename);
            Files.copy(file.getInputStream(), filePath);

            // 파일 URL 반환
            Map<String, String> response = new HashMap<>();
            response.put("url", "/uploads/" + filename);
            
            return ResponseEntity.ok(response);
        } catch (IOException e) {
            Map<String, String> response = new HashMap<>();
            response.put("error", "파일 업로드에 실패했습니다: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }
} 