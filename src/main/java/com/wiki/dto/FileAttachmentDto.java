package com.wiki.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * FileAttachment 관련 DTO 클래스들
 * 파일 첨부 관련 데이터 전송을 위한 구조를 정의합니다.
 */
public class FileAttachmentDto {
    
    /**
     * 파일 첨부 응답 DTO
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Response {
        private Long id;
        private String originalFileName;
        private String storedFileName;
        private Long fileSize;
        private String contentType;
        private String uploadedBy;
        private String pageTitle;
        private LocalDateTime uploadedAt;
        
        /**
         * 파일 크기를 사람이 읽기 쉬운 형태로 반환합니다.
         */
        public String getFormattedFileSize() {
            if (fileSize == null) return "0 B";
            
            long size = fileSize;
            String[] units = {"B", "KB", "MB", "GB"};
            int unitIndex = 0;
            
            while (size >= 1024 && unitIndex < units.length - 1) {
                size /= 1024;
                unitIndex++;
            }
            
            return size + " " + units[unitIndex];
        }
    }
} 