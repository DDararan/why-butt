package com.wiki.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * 웹 설정 클래스
 * CORS 설정과 정적 리소스 핸들링을 담당합니다.
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOriginPatterns(
                    "http://localhost:*", 
                    "http://127.0.0.1:*",
                    "http://10.*.*.*:*",
                    "http://170.*.*.*:*",
                    "http://192.168.*.*:*"
                )
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true)
                .exposedHeaders("Content-Disposition"); // 파일 다운로드를 위해 추가
        
        // WebSocket 엔드포인트에 대한 CORS 설정 추가
        registry.addMapping("/ws/**")
                .allowedOriginPatterns(
                    "http://localhost:*", 
                    "http://127.0.0.1:*",
                    "http://10.*.*.*:*",
                    "http://170.*.*.*:*",
                    "http://192.168.*.*:*"
                )
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true);
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // 업로드된 파일에 대한 정적 리소스 핸들러
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations("file:" + uploadDir + "/");
        
        // 프론트엔드 정적 파일 핸들러 (React 빌드 파일)
        registry.addResourceHandler("/static/**")
                .addResourceLocations("classpath:/static/static/");
        
        // React 앱의 루트 파일들
        registry.addResourceHandler("/*.js", "/*.css", "/*.ico", "/*.png", "/*.json", "/*.txt")
                .addResourceLocations("classpath:/static/");
    }
} 