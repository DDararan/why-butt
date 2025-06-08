package com.wiki.service;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.time.Duration;
import java.util.List;

/**
 * 로컬 LLM 서버를 통한 AI 글 생성 서비스
 * Text Generation WebUI, Ollama, vLLM 등 OpenAI 호환 API를 지원하는 로컬 서버와 연동
 */
@Service
@org.springframework.boot.autoconfigure.condition.ConditionalOnProperty(name = "ai.enabled", havingValue = "true", matchIfMissing = true)
public class LocalLlmService {

    @Value("${llm.api.url}")
    private String apiUrl;

    @Value("${llm.api.key:not-needed}")
    private String apiKey;

    @Value("${llm.model:gpt-3.5-turbo}")
    private String model;

    private final WebClient webClient;

    public LocalLlmService(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder
                .codecs(configurer -> configurer.defaultCodecs().maxInMemorySize(10 * 1024 * 1024)) // 10MB
                .build();
    }

    /**
     * 주제에 대한 위키 페이지 내용을 생성합니다.
     */
    public String generateWikiContent(String topic, String tone, String length) {
        try {
            String prompt = createPrompt(topic, tone, length);
            LlmRequest request = new LlmRequest();
            request.setModel(model);
            request.setMessages(List.of(new LlmMessage("user", prompt)));
            request.setMaxTokens(getMaxTokensByLength(length));
            request.setTemperature(0.7);
            request.setStream(false); // 스트림 비활성화

            System.out.println("로컬 LLM 서버 요청 시작: " + topic);
            System.out.println("API URL: " + apiUrl);

            LlmResponse response = webClient.post()
                    .uri(apiUrl)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                    .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(LlmResponse.class)
                    .timeout(Duration.ofMinutes(2)) // 2분 타임아웃
                    .block();

            if (response != null && response.getChoices() != null && !response.getChoices().isEmpty()) {
                String content = response.getChoices().get(0).getMessage().getContent();
                System.out.println("로컬 LLM 응답 성공");
                return content;
            } else {
                throw new RuntimeException("로컬 LLM 서버에서 유효한 응답을 받지 못했습니다.");
            }

        } catch (WebClientResponseException e) {
            System.err.println("로컬 LLM API 호출 실패: " + e.getResponseBodyAsString());
            
            // 서버가 실행되지 않은 경우에 대한 친절한 메시지
            if (e.getMessage().contains("Connection refused")) {
                throw new RuntimeException("로컬 LLM 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요. (URL: " + apiUrl + ")");
            }
            
            throw new RuntimeException("AI 글 생성에 실패했습니다: " + e.getMessage());
        } catch (Exception e) {
            System.err.println("로컬 LLM 서비스 오류: " + e.getMessage());
            throw new RuntimeException("AI 글 생성 중 오류가 발생했습니다: " + e.getMessage());
        }
    }

    /**
     * 기존 글을 개선하거나 확장합니다.
     */
    public String improveContent(String existingContent, String improvementType) {
        try {
            String prompt = createImprovementPrompt(existingContent, improvementType);
            LlmRequest request = new LlmRequest();
            request.setModel(model);
            request.setMessages(List.of(new LlmMessage("user", prompt)));
            request.setMaxTokens(1000);
            request.setTemperature(0.7);
            request.setStream(false);

            System.out.println("로컬 LLM 개선 요청 시작");

            LlmResponse response = webClient.post()
                    .uri(apiUrl)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                    .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(LlmResponse.class)
                    .timeout(Duration.ofMinutes(2))
                    .block();

            if (response != null && response.getChoices() != null && !response.getChoices().isEmpty()) {
                return response.getChoices().get(0).getMessage().getContent();
            } else {
                throw new RuntimeException("로컬 LLM 서버에서 유효한 응답을 받지 못했습니다.");
            }

        } catch (Exception e) {
            System.err.println("로컬 LLM 개선 서비스 오류: " + e.getMessage());
            throw new RuntimeException("AI 글 개선 중 오류가 발생했습니다: " + e.getMessage());
        }
    }

    /**
     * 서버 연결 상태를 확인합니다.
     */
    public boolean isServerAvailable() {
        try {
            // 간단한 요청으로 서버 상태 확인
            LlmRequest testRequest = new LlmRequest();
            testRequest.setModel(model);
            testRequest.setMessages(List.of(new LlmMessage("user", "Hello")));
            testRequest.setMaxTokens(10);
            testRequest.setStream(false);

            webClient.post()
                    .uri(apiUrl)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                    .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                    .bodyValue(testRequest)
                    .retrieve()
                    .bodyToMono(LlmResponse.class)
                    .timeout(Duration.ofSeconds(10))
                    .block();

            return true;
        } catch (Exception e) {
            System.out.println("로컬 LLM 서버 연결 실패: " + e.getMessage());
            return false;
        }
    }

    private String createPrompt(String topic, String tone, String length) {
        StringBuilder prompt = new StringBuilder();
        prompt.append("다음 주제에 대한 위키 형태의 글을 작성해주세요:\n\n");
        prompt.append("주제: ").append(topic).append("\n");
        prompt.append("글의 톤: ").append(getToneDescription(tone)).append("\n");
        prompt.append("글의 길이: ").append(getLengthDescription(length)).append("\n\n");
        prompt.append("요구사항:\n");
        prompt.append("- 마크다운 형식으로 작성\n");
        prompt.append("- 적절한 제목과 소제목 사용\n");
        prompt.append("- 정확하고 유용한 정보 포함\n");
        prompt.append("- 한국어로 작성\n");
        prompt.append("- 위키 스타일의 객관적이고 정보성 있는 글\n\n");
        prompt.append("내용:");
        
        return prompt.toString();
    }

    private String createImprovementPrompt(String existingContent, String improvementType) {
        StringBuilder prompt = new StringBuilder();
        prompt.append("다음 글을 개선해주세요:\n\n");
        prompt.append("개선 유형: ").append(getImprovementDescription(improvementType)).append("\n\n");
        prompt.append("기존 글:\n").append(existingContent).append("\n\n");
        prompt.append("개선된 글:");
        
        return prompt.toString();
    }

    private String getToneDescription(String tone) {
        return switch (tone.toLowerCase()) {
            case "formal" -> "공식적이고 학술적인 톤";
            case "casual" -> "친근하고 편안한 톤";
            case "technical" -> "기술적이고 전문적인 톤";
            default -> "중립적이고 객관적인 톤";
        };
    }

    private String getLengthDescription(String length) {
        return switch (length.toLowerCase()) {
            case "short" -> "간단명료한 짧은 글 (200-400자)";
            case "medium" -> "적당한 길이의 글 (400-800자)";
            case "long" -> "자세하고 긴 글 (800자 이상)";
            default -> "적당한 길이의 글";
        };
    }

    private String getImprovementDescription(String improvementType) {
        return switch (improvementType.toLowerCase()) {
            case "grammar" -> "문법과 맞춤법 개선";
            case "structure" -> "글의 구조와 논리적 흐름 개선";
            case "expand" -> "내용을 더 자세하게 확장";
            case "summarize" -> "핵심 내용으로 요약";
            default -> "전반적인 내용 개선";
        };
    }

    private int getMaxTokensByLength(String length) {
        return switch (length.toLowerCase()) {
            case "short" -> 300;
            case "medium" -> 600;
            case "long" -> 1200;
            default -> 600;
        };
    }

    // 로컬 LLM API 요청/응답 DTO 클래스들
    @Data
    public static class LlmRequest {
        private String model;
        private List<LlmMessage> messages;
        @JsonProperty("max_tokens")
        private Integer maxTokens;
        private Double temperature;
        private Boolean stream = false;
    }

    @Data
    public static class LlmMessage {
        private String role;
        private String content;

        public LlmMessage() {}

        public LlmMessage(String role, String content) {
            this.role = role;
            this.content = content;
        }
    }

    @Data
    public static class LlmResponse {
        private List<LlmChoice> choices;
    }

    @Data
    public static class LlmChoice {
        private LlmMessage message;
    }
} 