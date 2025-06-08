package com.wiki.dto;

import lombok.Data;
import java.time.LocalDateTime;

/**
 * 사용자 관련 데이터 전송 객체
 * 계층 간 데이터 전송을 위한 DTO 패턴 적용
 */
@Data
public class UserDto {

    public static class Request {
        
        /**
         * 로그인 요청 DTO
         */
        @Data
        public static class Login {
            private String loginId;
            private String password;
        }
        
        /**
         * 사용자 생성 요청 DTO
         */
        @Data
        public static class Create {
            private String staffId;
            private String loginId;
            private String password;
            private String userName;
            private String email;
        }
        
        /**
         * 사용자 수정 요청 DTO
         */
        @Data
        public static class Update {
            private String password;
            private String userName;
            private String email;
            private Boolean isActive;
        }
    }

    public static class Response {
        
        /**
         * 로그인 응답 DTO
         */
        @Data
        public static class Login {
            private String staffId;
            private String loginId;
            private String userName;
            private String email;
            private String token; // 향후 JWT 토큰 등을 위해 예비
        }
        
        /**
         * 사용자 정보 응답 DTO
         */
        @Data
        public static class Detail {
            private String staffId;
            private String loginId;
            private String userName;
            private String email;
            private Boolean isActive;
            private LocalDateTime createdAt;
            private LocalDateTime updatedAt;
        }
        
        /**
         * 사용자 목록 응답 DTO
         */
        @Data
        public static class Summary {
            private String staffId;
            private String loginId;
            private String userName;
            private Boolean isActive;
            private LocalDateTime createdAt;
        }
    }
} 