package com.wiki.dto;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class WikiPageDto {
    private Long id;
    private String title;
    private String content;
    private Long parentId;
    private Integer depth;
    private String path;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static class Request {
        @Data
        public static class Create {
            private String title;
            private String content;
            private Long parentId;
            private String pageType = "MENU";
        }

        @Data
        public static class Update {
            private String title;
            private String content;
            private Long parentId;
            private String pageType;
        }

        @Data
        public static class UpdateOrder {
            private Long id;
            private Integer displayOrder;

            public UpdateOrder() {}

            public UpdateOrder(Long id, Integer displayOrder) {
                this.id = id;
                this.displayOrder = displayOrder;
            }

            public Long getId() { return id; }
            public void setId(Long id) { this.id = id; }
            public Integer getDisplayOrder() { return displayOrder; }
            public void setDisplayOrder(Integer displayOrder) { this.displayOrder = displayOrder; }
        }

        /**
         * 페이지 부모 변경 요청 DTO
         */
        public static class UpdateParent {
            private Long pageId;
            private Long newParentId; // null이면 최상위로 이동
            private Integer displayOrder;

            public UpdateParent() {}

            public UpdateParent(Long pageId, Long newParentId, Integer displayOrder) {
                this.pageId = pageId;
                this.newParentId = newParentId;
                this.displayOrder = displayOrder;
            }

            public Long getPageId() { return pageId; }
            public void setPageId(Long pageId) { this.pageId = pageId; }
            
            public Long getNewParentId() { return newParentId; }
            public void setNewParentId(Long newParentId) { this.newParentId = newParentId; }
            
            public Integer getDisplayOrder() { return displayOrder; }
            public void setDisplayOrder(Integer displayOrder) { this.displayOrder = displayOrder; }
        }
    }

    public static class Response {
        @Data
        public static class Summary {
            private Long id;
            private String title;
            private Long parentId;
            private Integer depth;
            private String path;
            private Integer displayOrder;
            private String pageType;
            private LocalDateTime updatedAt;
            private List<Summary> children;
        }

        @Data
        public static class Detail {
            private Long id;
            private String title;
            private String content;
            private Long parentId;
            private Integer depth;
            private String path;
            private Integer displayOrder;
            private String pageType;
            private LocalDateTime createdAt;
            private LocalDateTime updatedAt;
            private List<Summary> children;
            private Summary parent;
            private List<History> history;
        }
        
        @Data
        public static class History {
            private Long id;
            private Integer seqNbr;
            private String title;
            private String content;
            private LocalDateTime createdAt;
            private LocalDateTime updatedAt;
        }
        
        @Data
        public static class SearchResult {
            private Long id;
            private String title;
            private String snippet; // 검색어 주변 텍스트
            private boolean titleMatch; // 제목에서 검색어가 발견되었는지 여부
            private LocalDateTime updatedAt;
        }
    }
} 