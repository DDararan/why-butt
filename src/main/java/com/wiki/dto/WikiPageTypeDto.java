package com.wiki.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class WikiPageTypeDto {

    public static class Request {
        @Data
        public static class Create {
            private String pageType;
            private String pageTitle;
        }

        @Data
        public static class Update {
            private String pageTitle;
        }
    }

    public static class Response {
        @Data
        public static class Detail {
            private String pageType;
            private String pageTitle;
            private String creationStaffId;
            private String modifyStaffId;
            private LocalDateTime createdAt;
            private LocalDateTime updatedAt;
        }
    }
} 