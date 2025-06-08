package com.wiki.controller;

import com.wiki.dto.WikiPageDto;
import com.wiki.dto.UserDto;
import com.wiki.service.WikiPageService;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/wiki")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:3000")
public class WikiPageController {
    private final WikiPageService wikiPageService;

    @GetMapping("/pages")
    public ResponseEntity<List<WikiPageDto.Response.Summary>> getRecentPages() {
        return ResponseEntity.ok(wikiPageService.getRecentPages());
    }

    @GetMapping("/pages/by-type/{pageType}")
    public ResponseEntity<List<WikiPageDto.Response.Summary>> getPagesByType(@PathVariable String pageType) {
        return ResponseEntity.ok(wikiPageService.getPagesByType(pageType));
    }
    
    /**
     * 최근 일주일 동안 작성된 페이지 조회
     */
    @GetMapping("/pages/recent-week")
    public ResponseEntity<List<WikiPageDto.Response.Summary>> getRecentWeekPages() {
        System.out.println("최근 일주일 페이지 API 호출");
        List<WikiPageDto.Response.Summary> pages = wikiPageService.getRecentWeekPages();
        return ResponseEntity.ok(pages);
    }

    @GetMapping("/pages/{title}")
    public ResponseEntity<WikiPageDto.Response.Detail> getPage(@PathVariable String title) {
        return ResponseEntity.ok(wikiPageService.getPage(title));
    }

    @PostMapping("/pages")
    public ResponseEntity<?> createPage(@RequestBody WikiPageDto.Request.Create request, HttpSession session) {
        try {
            // 로그인 확인
            UserDto.Response.Login user = (UserDto.Response.Login) session.getAttribute("user");
            if (user == null) {
                return ResponseEntity.status(401).body("로그인이 필요합니다.");
            }
            
            WikiPageDto.Response.Detail createdPage = wikiPageService.createPage(request, user.getStaffId());
            return ResponseEntity.ok(createdPage);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("페이지 생성 실패: " + e.getMessage());
        }
    }

    @PutMapping("/pages/{title}")
    public ResponseEntity<?> updatePage(
            @PathVariable String title,
            @RequestBody WikiPageDto.Request.Update request, 
            HttpSession session) {
        try {
            // 로그인 확인
            UserDto.Response.Login user = (UserDto.Response.Login) session.getAttribute("user");
            if (user == null) {
                return ResponseEntity.status(401).body("로그인이 필요합니다.");
            }
            
            WikiPageDto.Response.Detail updatedPage = wikiPageService.updatePage(title, request, user.getStaffId());
            return ResponseEntity.ok(updatedPage);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("페이지 수정 실패: " + e.getMessage());
        }
    }

    @DeleteMapping("/pages/{title}")
    public ResponseEntity<Void> deletePage(@PathVariable String title) {
        wikiPageService.deletePage(title);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/search")
    public ResponseEntity<List<WikiPageDto.Response.Summary>> searchPages(@RequestParam String query) {
        return ResponseEntity.ok(wikiPageService.searchPages(query));
    }
    
    /**
     * 제목과 내용에서 통합 검색
     */
    @GetMapping("/search/full")
    public ResponseEntity<List<WikiPageDto.Response.SearchResult>> searchPagesInTitleAndContent(@RequestParam String query) {
        System.out.println("검색 API 호출 - query: " + query);
        List<WikiPageDto.Response.SearchResult> results = wikiPageService.searchPagesInTitleAndContent(query);
        return ResponseEntity.ok(results);
    }

    /**
     * 페이지 순서 변경
     */
    @PutMapping("/pages/order")
    public ResponseEntity<Void> updatePagesOrder(@RequestBody List<WikiPageDto.Request.UpdateOrder> orderUpdates) {
        System.out.println("페이지 순서 변경 API 호출");
        wikiPageService.updatePagesOrder(orderUpdates);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/pages/parent")
    public ResponseEntity<String> updatePageParent(@RequestBody WikiPageDto.Request.UpdateParent updateParent) {
        try {
            System.out.println("페이지 부모 변경 API 호출: " + updateParent.getPageId() + " -> " + updateParent.getNewParentId());
            wikiPageService.updatePageParent(updateParent);
            return ResponseEntity.ok("페이지 부모가 성공적으로 변경되었습니다.");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body("페이지 부모 변경 실패: " + e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("페이지 부모 변경 중 오류 발생: " + e.getMessage());
        }
    }
} 