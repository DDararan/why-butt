package com.wiki.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

/**
 * React SPA 라우팅을 위한 컨트롤러
 * API가 아닌 모든 요청을 index.html로 전달하여 React Router가 처리하도록 합니다.
 */
@Controller
public class WebController {

    /**
     * React Router를 위한 포워딩
     * API 요청과 정적 리소스가 아닌 경로를 index.html로 포워딩
     */
    @RequestMapping(value = {"/", "/wiki/**", "/edit/**", "/home", "/login"})
    public String forward() {
        return "forward:/index.html";
    }
} 