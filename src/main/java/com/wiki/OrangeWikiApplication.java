package com.wiki;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@SpringBootApplication
@EnableJpaAuditing
public class OrangeWikiApplication {
    public static void main(String[] args) {
        System.out.println("=== WHY-BUTT (와이벗) Application 시작 ===");
        System.out.println("What have you been up to today?");
        System.out.println("컴포넌트 스캔 패키지: com.wiki");
        SpringApplication.run(OrangeWikiApplication.class, args);
        System.out.println("=== WHY-BUTT (와이벗) Application 시작 완료 ===");
    }
} 