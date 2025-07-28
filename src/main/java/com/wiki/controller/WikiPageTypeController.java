package com.wiki.controller;

import com.wiki.dto.WikiPageTypeDto;
import com.wiki.dto.UserDto;
import com.wiki.service.WikiPageTypeService;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/wiki/page-types")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:3000")
public class WikiPageTypeController {
    private final WikiPageTypeService wikiPageTypeService;

    @GetMapping
    public ResponseEntity<List<WikiPageTypeDto.Response.Detail>> getAllPageTypes() {
        return ResponseEntity.ok(wikiPageTypeService.getAllPageTypes());
    }

    @GetMapping("/{pageType}")
    public ResponseEntity<WikiPageTypeDto.Response.Detail> getPageType(@PathVariable String pageType) {
        return ResponseEntity.ok(wikiPageTypeService.getPageType(pageType));
    }

    @PostMapping
    public ResponseEntity<?> createPageType(@RequestBody WikiPageTypeDto.Request.Create request, HttpSession session) {
        try {
            // 로그인 확인
            UserDto.Response.Login user = (UserDto.Response.Login) session.getAttribute("user");
            if (user == null) {
                return ResponseEntity.status(401).body("로그인이 필요합니다.");
            }
            
            WikiPageTypeDto.Response.Detail createdPageType = wikiPageTypeService.createPageType(request, user.getStaffId());
            return ResponseEntity.ok(createdPageType);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body("페이지 타입 생성 실패: " + e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("페이지 타입 생성 중 오류 발생: " + e.getMessage());
        }
    }

    @PutMapping("/{pageType}")
    public ResponseEntity<?> updatePageType(
            @PathVariable String pageType,
            @RequestBody WikiPageTypeDto.Request.Update request, 
            HttpSession session) {
        try {
            // 로그인 확인
            UserDto.Response.Login user = (UserDto.Response.Login) session.getAttribute("user");
            if (user == null) {
                return ResponseEntity.status(401).body("로그인이 필요합니다.");
            }
            
            WikiPageTypeDto.Response.Detail updatedPageType = wikiPageTypeService.updatePageType(pageType, request, user.getStaffId());
            return ResponseEntity.ok(updatedPageType);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("페이지 타입 수정 실패: " + e.getMessage());
        }
    }

    @DeleteMapping("/{pageType}")
    public ResponseEntity<?> deletePageType(@PathVariable String pageType, HttpSession session) {
        try {
            // 로그인 확인
            UserDto.Response.Login user = (UserDto.Response.Login) session.getAttribute("user");
            if (user == null) {
                return ResponseEntity.status(401).body("로그인이 필요합니다.");
            }
            
            wikiPageTypeService.deletePageType(pageType);
            return ResponseEntity.ok("페이지 타입이 성공적으로 삭제되었습니다.");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("페이지 타입 삭제 실패: " + e.getMessage());
        }
    }
} 