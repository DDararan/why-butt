package com.wiki.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * 정적 리소스 컨트롤러
 * 
 * 업로드된 파일들에 대한 웹 접근을 제공합니다.
 * 파일 서빙 및 미디어 타입 설정을 담당합니다.
 */
@RestController
@RequestMapping("/api/files")
public class StaticResourceController {

    @Value("${app.file.upload-dir:uploads}")
    private String uploadDir;

    /**
     * 업로드된 이미지 파일 서빙
     * 
     * @param year 연도
     * @param month 월
     * @param day 일
     * @param filename 파일명
     * @return 이미지 파일 리소스
     */
    @GetMapping("/images/{year}/{month}/{day}/{filename:.+}")
    public ResponseEntity<Resource> serveFile(
            @PathVariable String year,
            @PathVariable String month, 
            @PathVariable String day,
            @PathVariable String filename) {
        
        try {
            // 파일 경로 구성
            Path filePath = Paths.get(uploadDir)
                .resolve(year)
                .resolve(month)
                .resolve(day)
                .resolve(filename)
                .normalize();

            Resource resource = new UrlResource(filePath.toUri());
            
            if (resource.exists() && resource.isReadable()) {
                // 파일 확장자에 따른 Content-Type 설정
                String contentType = determineContentType(filename);
                
                return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + resource.getFilename() + "\"")
                    .body(resource);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (MalformedURLException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * 파일 확장자에 따른 Content-Type 결정
     * 
     * @param filename 파일명
     * @return Content-Type 문자열
     */
    private String determineContentType(String filename) {
        String extension = "";
        int dotIndex = filename.lastIndexOf('.');
        if (dotIndex > 0) {
            extension = filename.substring(dotIndex + 1).toLowerCase();
        }

        return switch (extension) {
            case "png" -> "image/png";
            case "jpg", "jpeg" -> "image/jpeg";
            case "gif" -> "image/gif";
            case "bmp" -> "image/bmp";
            case "webp" -> "image/webp";
            case "svg" -> "image/svg+xml";
            default -> "application/octet-stream";
        };
    }
} 