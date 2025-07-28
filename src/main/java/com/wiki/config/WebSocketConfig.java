package com.wiki.config;

import com.wiki.websocket.YjsWebSocketHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

/**
 * WebSocket 설정 클래스
 * 실시간 편집 협업 기능을 위한 WebSocket 연결을 설정합니다.
 */
@Configuration
@EnableWebSocket
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketConfigurer {
    
    private final YjsWebSocketHandler yjsWebSocketHandler;

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        // 새로운 Yjs WebSocket 핸들러 (바이너리 메시지 지원)
        // y-websocket이 roomName을 경로에 추가하므로 와일드카드 사용
        registry.addHandler(yjsWebSocketHandler, "/ws/yjs/**")
                .setAllowedOriginPatterns(
                    "http://localhost:*", 
                    "http://127.0.0.1:*",
                    "http://10.*.*.*:*",
                    "http://192.168.*.*:*",
                    "ws://localhost:*",
                    "ws://127.0.0.1:*"
                );
        
        // collaborativeEditingService를 위한 호환 엔드포인트 (현재 사용 안 함)
        // 나중에 제거 예정
        registry.addHandler(yjsWebSocketHandler, "/ws/collaborative/**")
                .setAllowedOriginPatterns(
                    "http://localhost:*", 
                    "http://127.0.0.1:*",
                    "http://10.*.*.*:*",
                    "http://192.168.*.*:*",
                    "ws://localhost:*",
                    "ws://127.0.0.1:*"
                );
    }
} 