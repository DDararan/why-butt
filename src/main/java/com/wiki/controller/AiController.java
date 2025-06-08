package com.wiki.controller;

import com.wiki.service.LocalLlmService;
import com.wiki.service.DocumentAnalysisService;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * AI 기반 글 생성 기능을 제공하는 컨트롤러
 * 로컬 LLM 서버를 통해 위키 페이지 작성을 도와줍니다.
 */
@RestController
@RequestMapping("/api/ai")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:8181"})
@org.springframework.boot.autoconfigure.condition.ConditionalOnProperty(name = "ai.enabled", havingValue = "true", matchIfMissing = true)
public class AiController {

    @Autowired
    private LocalLlmService localLlmService;

    @Autowired
    private DocumentAnalysisService documentAnalysisService;

    /**
     * 주제로 위키 내용 생성
     */
    @PostMapping("/generate")
    public ResponseEntity<?> generateContent(@RequestBody GenerateRequest request) {
        try {
            System.out.println("AI 글 생성 요청: " + request.getTopic());
            
            String content = localLlmService.generateWikiContent(
                request.getTopic(), 
                request.getTone(), 
                request.getLength()
            );
            
            return ResponseEntity.ok(new GenerateResponse(content, "성공적으로 생성되었습니다."));
            
        } catch (Exception e) {
            System.err.println("AI 글 생성 실패: " + e.getMessage());
            return ResponseEntity.badRequest()
                .body(new ErrorResponse("글 생성에 실패했습니다: " + e.getMessage()));
        }
    }

    /**
     * 기존 글 개선
     */
    @PostMapping("/improve")
    public ResponseEntity<?> improveContent(@RequestBody ImproveRequest request) {
        try {
            System.out.println("AI 글 개선 요청");
            
            String improvedContent = localLlmService.improveContent(
                request.getContent(), 
                request.getImprovementType()
            );
            
            return ResponseEntity.ok(new GenerateResponse(improvedContent, "성공적으로 개선되었습니다."));
            
        } catch (Exception e) {
            System.err.println("AI 글 개선 실패: " + e.getMessage());
            return ResponseEntity.badRequest()
                .body(new ErrorResponse("글 개선에 실패했습니다: " + e.getMessage()));
        }
    }

    /**
     * 회의록/쿼리를 분석하여 자동으로 위키 페이지 생성
     */
    @PostMapping("/analyze-document")
    public ResponseEntity<?> analyzeAndCreatePage(@RequestBody AnalyzeDocumentRequest request) {
        try {
            System.out.println("문서 자동 분석 요청: " + request.getDocumentType());
            
            DocumentAnalysisService.AutoPageResult result = documentAnalysisService.analyzeAndCreatePage(
                request.getDocumentContent(),
                request.getDocumentType(),
                request.getTitle()
            );
            
            return ResponseEntity.ok(new AnalyzeDocumentResponse(
                result.getCreatedPage(),
                result.getRecommendedCategory(),
                result.getConfidence(),
                result.getReason(),
                "문서가 성공적으로 분석되어 위키 페이지가 생성되었습니다."
            ));
            
        } catch (Exception e) {
            System.err.println("문서 분석 실패: " + e.getMessage());
            return ResponseEntity.badRequest()
                .body(new ErrorResponse("문서 분석에 실패했습니다: " + e.getMessage()));
        }
    }

    /**
     * LLM 서버 상태 확인
     */
    @GetMapping("/status")
    public ResponseEntity<?> checkStatus() {
        try {
            boolean isAvailable = localLlmService.isServerAvailable();
            
            if (isAvailable) {
                return ResponseEntity.ok(new StatusResponse(true, "로컬 LLM 서버가 정상 작동 중입니다."));
            } else {
                return ResponseEntity.ok(new StatusResponse(false, "로컬 LLM 서버에 연결할 수 없습니다."));
            }
            
        } catch (Exception e) {
            return ResponseEntity.ok(new StatusResponse(false, "서버 상태 확인 실패: " + e.getMessage()));
        }
    }

    // DTO 클래스들
    @Data
    public static class GenerateRequest {
        private String topic;
        private String tone = "neutral";     // formal, casual, technical, neutral
        private String length = "medium";    // short, medium, long
    }

    @Data
    public static class ImproveRequest {
        private String content;
        private String improvementType = "general"; // grammar, structure, expand, summarize, general
    }

    @Data
    public static class AnalyzeDocumentRequest {
        private String documentContent;
        private String documentType;  // "회의록", "쿼리", "보고서" 등
        private String title;         // 선택사항, 없으면 자동 생성
    }

    @Data
    public static class GenerateResponse {
        private String content;
        private String message;

        public GenerateResponse(String content, String message) {
            this.content = content;
            this.message = message;
        }
    }

    @Data
    public static class AnalyzeDocumentResponse {
        private Object createdPage;
        private String recommendedCategory;
        private int confidence;
        private String reason;
        private String message;

        public AnalyzeDocumentResponse(Object createdPage, String recommendedCategory, int confidence, String reason, String message) {
            this.createdPage = createdPage;
            this.recommendedCategory = recommendedCategory;
            this.confidence = confidence;
            this.reason = reason;
            this.message = message;
        }
    }

    @Data
    public static class StatusResponse {
        private boolean available;
        private String message;

        public StatusResponse(boolean available, String message) {
            this.available = available;
            this.message = message;
        }
    }

    @Data
    public static class ErrorResponse {
        private String error;

        public ErrorResponse(String error) {
            this.error = error;
        }
    }
} 