package com.wiki.dto;

import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;

/**
 * 위키 페이지 댓글 DTO
 * SOLID 원칙에 따라 데이터 전송 객체의 단일 책임 수행
 */
public class WikiPageCommentDto {
    
    /**
     * 댓글 응답 DTO
     */
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Response {
        private Long commentId;
        private Long wikiPageId;
        private String content;
        private String staffId;
        private LocalDateTime updatedAt;
        
        /**
         * 작성자 표시명 반환
         * staffId를 그대로 노출하지 않고 표시용으로 변환
         * 
         * @return 작성자 표시명
         */
        public String getAuthorDisplay() {
            return staffId != null ? staffId : "Unknown";
        }
    }
    
    /**
     * 댓글 생성 요청 DTO
     */
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateRequest {
        private String content;
        
        /**
         * 내용 검증
         * 
         * @return 유효성 검증 결과
         */
        public boolean isValid() {
            return content != null && 
                   !content.trim().isEmpty() && 
                   content.length() <= 2000;
        }
    }
    
    /**
     * 댓글 수정 요청 DTO
     */
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdateRequest {
        private String content;
        
        /**
         * 내용 검증
         * 
         * @return 유효성 검증 결과
         */
        public boolean isValid() {
            return content != null && 
                   !content.trim().isEmpty() && 
                   content.length() <= 2000;
        }
    }
    
    /**
     * 댓글 목록 응답 DTO
     */
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CommentListResponse {
        private java.util.List<Response> comments;
        private long totalCount;
    }
} 