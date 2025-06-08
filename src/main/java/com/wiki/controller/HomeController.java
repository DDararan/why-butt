package com.wiki.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * React 앱을 위한 홈 컨트롤러
 * SPA(Single Page Application) 라우팅 지원
 */
@Controller
public class HomeController {
    
    /**
     * React 앱의 모든 라우트를 index.html로 포워딩
     * React Router가 클라이언트 측에서 라우팅을 처리
     */
    @GetMapping(value = {"/", "/wiki/**", "/login"})
    public String index() {
        return "forward:/index.html";
    }
} 