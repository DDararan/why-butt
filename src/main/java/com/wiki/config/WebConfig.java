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

    @Value("${app.file.upload-dir:uploads}")
    private String uploadDir;

    @Value("${app.cors.allowed-origins}")
    private String allowedOrigins;

    @Value("${file.upload.path:uploads}")
    private String uploadPath;

    /**
     * 정적 리소스 핸들러 설정
     * React 빌드 파일들이 올바르게 서빙되도록 설정
     */
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // React 빌드 파일들을 위한 핸들러
        registry.addResourceHandler("/js/**", "/css/**")
                .addResourceLocations("classpath:/static/static/js/", "classpath:/static/static/css/")
                .setCachePeriod(3600);
        
        // 기타 정적 리소스
        registry.addResourceHandler("/favicon.ico", "/manifest.json", "/robots.txt", "/*.png")
                .addResourceLocations("classpath:/static/")
                .setCachePeriod(3600);

        // 업로드된 파일에 대한 정적 리소스 핸들러 설정
        registry.addResourceHandler("/api/files/**")
                .addResourceLocations("file:" + uploadDir + "/")
                .setCachePeriod(3600);

        registry.addResourceHandler("/uploads/**")
                .addResourceLocations("file:" + uploadPath + "/");
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins(allowedOrigins.split(","))
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true)
                .maxAge(3600);
    }
} 