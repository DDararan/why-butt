package com.wiki.service;

import com.wiki.dto.WikiPageDto;
import com.wiki.entity.WikiPage;
import com.wiki.repository.WikiPageRepository;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 문서 분석 및 자동 위키 페이지 생성 서비스
 * 회의록, 쿼리 결과 등을 분석하여 적절한 카테고리에 자동으로 정리합니다.
 */
@Service
@org.springframework.boot.autoconfigure.condition.ConditionalOnProperty(name = "ai.enabled", havingValue = "true", matchIfMissing = true)
public class DocumentAnalysisService {

    @Autowired
    private LocalLlmService localLlmService;

    @Autowired
    private WikiPageService wikiPageService;

    @Autowired
    private WikiPageRepository wikiPageRepository;

    /**
     * 문서를 분석하고 자동으로 위키 페이지를 생성합니다.
     */
    @Transactional
    public AutoPageResult analyzeAndCreatePage(String documentContent, String documentType, String title) {
        try {
            System.out.println("문서 분석 시작: " + documentType + " - " + title);

            // 1단계: 기존 위키 페이지 목록 가져오기
            List<WikiPageSummary> existingPages = getExistingPageStructure();

            // 2단계: LLM으로 카테고리 분석 및 추천
            CategoryRecommendation recommendation = analyzeCategoryWithLLM(documentContent, documentType, existingPages);

            // 3단계: 문서 내용 요약 및 정리
            String summarizedContent = summarizeDocumentWithLLM(documentContent, documentType, recommendation.getRecommendedCategory());

            // 4단계: 자동 제목 생성 (사용자가 제공하지 않은 경우)
            String finalTitle = (title != null && !title.trim().isEmpty()) ? title : generateTitleWithLLM(documentContent, documentType);

            // 5단계: 위키 페이지 생성
            WikiPageDto.Request.Create createRequest = new WikiPageDto.Request.Create();
            createRequest.setTitle(finalTitle);
            createRequest.setContent(summarizedContent);
            createRequest.setParentId(recommendation.getParentPageId());

            WikiPageDto.Response.Detail createdPage = wikiPageService.createPage(createRequest, "SYSTEM");

            System.out.println("자동 페이지 생성 완료: " + finalTitle);

            return new AutoPageResult(
                createdPage,
                recommendation.getRecommendedCategory(),
                recommendation.getConfidence(),
                recommendation.getReason()
            );

        } catch (Exception e) {
            System.err.println("문서 분석 및 페이지 생성 실패: " + e.getMessage());
            throw new RuntimeException("문서 분석 및 자동 페이지 생성에 실패했습니다: " + e.getMessage());
        }
    }

    /**
     * 기존 위키 페이지 구조를 가져옵니다.
     */
    private List<WikiPageSummary> getExistingPageStructure() {
        List<WikiPageDto.Response.Summary> pages = wikiPageService.getRecentPages();
        return pages.stream()
                .map(page -> new WikiPageSummary(page.getId(), page.getTitle(), page.getDepth()))
                .collect(Collectors.toList());
    }

    /**
     * LLM을 사용하여 카테고리를 분석하고 추천합니다.
     */
    private CategoryRecommendation analyzeCategoryWithLLM(String documentContent, String documentType, List<WikiPageSummary> existingPages) {
        StringBuilder prompt = new StringBuilder();
        prompt.append("다음 문서를 분석하여 가장 적합한 카테고리를 추천해주세요.\n\n");
        
        prompt.append("문서 유형: ").append(documentType).append("\n");
        prompt.append("문서 내용:\n").append(documentContent).append("\n\n");
        
        prompt.append("기존 위키 카테고리 목록:\n");
        for (WikiPageSummary page : existingPages) {
            String indent = "  ".repeat(page.getDepth());
            prompt.append(indent).append("- ").append(page.getTitle()).append(" (ID: ").append(page.getId()).append(")\n");
        }
        
        prompt.append("\n다음 형식으로 응답해주세요:\n");
        prompt.append("추천 카테고리: [가장 적합한 기존 페이지 제목]\n");
        prompt.append("상위 페이지 ID: [해당 페이지의 ID 번호]\n");
        prompt.append("신뢰도: [1-10 점수]\n");
        prompt.append("이유: [추천 이유를 간단히 설명]\n");

        String llmResponse = localLlmService.generateWikiContent(prompt.toString(), "formal", "short");
        
        return parseCategoryRecommendation(llmResponse);
    }

    /**
     * LLM을 사용하여 문서를 요약하고 정리합니다.
     */
    private String summarizeDocumentWithLLM(String documentContent, String documentType, String category) {
        StringBuilder prompt = new StringBuilder();
        prompt.append("다음 ").append(documentType).append("을(를) 위키 페이지 형태로 요약 정리해주세요.\n\n");
        prompt.append("카테고리: ").append(category).append("\n");
        prompt.append("원본 내용:\n").append(documentContent).append("\n\n");
        
        prompt.append("요구사항:\n");
        prompt.append("- 마크다운 형식으로 작성\n");
        prompt.append("- 핵심 내용을 체계적으로 정리\n");
        prompt.append("- 제목, 소제목, 요약, 세부사항 포함\n");
        prompt.append("- 날짜: ").append(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"))).append("\n");
        prompt.append("- 객관적이고 정보성 있는 스타일\n\n");
        
        if (documentType.equals("회의록")) {
            prompt.append("회의록 특화 요구사항:\n");
            prompt.append("- 참석자, 안건, 결정사항, 후속조치 명확히 구분\n");
            prompt.append("- 액션 아이템이 있다면 별도로 정리\n\n");
        } else if (documentType.equals("쿼리")) {
            prompt.append("쿼리 특화 요구사항:\n");
            prompt.append("- 쿼리 목적, 결과 요약, 인사이트 포함\n");
            prompt.append("- 중요한 발견사항이나 패턴 강조\n\n");
        }
        
        prompt.append("정리된 내용:");

        return localLlmService.generateWikiContent(prompt.toString(), "formal", "medium");
    }

    /**
     * LLM을 사용하여 적절한 제목을 생성합니다.
     */
    private String generateTitleWithLLM(String documentContent, String documentType) {
        String prompt = String.format(
            "다음 %s의 내용을 바탕으로 적절한 제목을 생성해주세요.\n\n내용:\n%s\n\n요구사항:\n- 간결하고 명확한 제목\n- 10글자 이내\n- %s임을 알 수 있도록\n\n제목:",
            documentType, documentContent.substring(0, Math.min(500, documentContent.length())), documentType
        );

        String response = localLlmService.generateWikiContent(prompt, "formal", "short");
        
        // LLM 응답에서 제목만 추출
        String[] lines = response.split("\n");
        for (String line : lines) {
            line = line.trim();
            if (!line.isEmpty() && !line.startsWith("#") && !line.startsWith("제목")) {
                return line.replaceAll("[\"'`]", "").trim();
            }
        }
        
        // 기본 제목
        return documentType + "_" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
    }

    /**
     * LLM 응답을 파싱하여 카테고리 추천을 추출합니다.
     */
    private CategoryRecommendation parseCategoryRecommendation(String llmResponse) {
        String recommendedCategory = "기타";
        Long parentPageId = null;
        int confidence = 5;
        String reason = "자동 분석";

        String[] lines = llmResponse.split("\n");
        for (String line : lines) {
            line = line.trim();
            if (line.startsWith("추천 카테고리:") || line.startsWith("카테고리:")) {
                recommendedCategory = line.split(":")[1].trim();
            } else if (line.startsWith("상위 페이지 ID:") || line.startsWith("ID:")) {
                try {
                    String idStr = line.split(":")[1].trim().replaceAll("[^0-9]", "");
                    if (!idStr.isEmpty()) {
                        parentPageId = Long.parseLong(idStr);
                    }
                } catch (Exception e) {
                    System.err.println("페이지 ID 파싱 실패: " + line);
                }
            } else if (line.startsWith("신뢰도:")) {
                try {
                    String confidenceStr = line.split(":")[1].trim().replaceAll("[^0-9]", "");
                    if (!confidenceStr.isEmpty()) {
                        confidence = Integer.parseInt(confidenceStr);
                    }
                } catch (Exception e) {
                    System.err.println("신뢰도 파싱 실패: " + line);
                }
            } else if (line.startsWith("이유:")) {
                reason = line.split(":", 2)[1].trim();
            }
        }

        return new CategoryRecommendation(recommendedCategory, parentPageId, confidence, reason);
    }

    // DTO 클래스들
    @Data
    public static class WikiPageSummary {
        private Long id;
        private String title;
        private int depth;

        public WikiPageSummary(Long id, String title, int depth) {
            this.id = id;
            this.title = title;
            this.depth = depth;
        }
    }

    @Data
    public static class CategoryRecommendation {
        private String recommendedCategory;
        private Long parentPageId;
        private int confidence;
        private String reason;

        public CategoryRecommendation(String recommendedCategory, Long parentPageId, int confidence, String reason) {
            this.recommendedCategory = recommendedCategory;
            this.parentPageId = parentPageId;
            this.confidence = confidence;
            this.reason = reason;
        }
    }

    @Data
    public static class AutoPageResult {
        private WikiPageDto.Response.Detail createdPage;
        private String recommendedCategory;
        private int confidence;
        private String reason;

        public AutoPageResult(WikiPageDto.Response.Detail createdPage, String recommendedCategory, int confidence, String reason) {
            this.createdPage = createdPage;
            this.recommendedCategory = recommendedCategory;
            this.confidence = confidence;
            this.reason = reason;
        }
    }
} 