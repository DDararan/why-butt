package com.wiki.controller;

import com.wiki.dto.WikiPageDto;
import com.wiki.dto.UserDto;
import com.wiki.entity.WikiPage;
import com.wiki.service.WikiPageService;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Slf4j
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

    @GetMapping("/pages/id/{id}")
    public ResponseEntity<WikiPageDto.Response.Detail> getPageById(@PathVariable Long id) {
        try {
            WikiPageDto.Response.Detail page = wikiPageService.getPageById(id);
            
            if (page == null) {
                return ResponseEntity.notFound().build();
            }
            
            return ResponseEntity.ok(page);
        } catch (Exception e) {
            log.error("페이지 조회 실패 - id: {}, 오류: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(null);
        }
    }

    @PostMapping("/pages")
    public ResponseEntity<?> createPage(@RequestBody WikiPageDto.Request.Create request, HttpSession session) {
        try {
            // 로그인 확인
            UserDto.Response.Login user = (UserDto.Response.Login) session.getAttribute("user");
            if (user == null) {
                return ResponseEntity.status(401).body("로그인이 필요합니다.");
            }
            
            WikiPageDto.Response.Detail createdPage = wikiPageService.createPage(request, user.getStaffId(), user.getUserName());
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
            
            WikiPageDto.Response.Detail currentPage = wikiPageService.getPage(title);
            WikiPageDto.Response.Detail updatedPage = wikiPageService.updatePage(currentPage.getId(), request, user.getStaffId(), user.getUserName());
            return ResponseEntity.ok(updatedPage);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("페이지 수정 실패: " + e.getMessage());
        }
    }

    @PutMapping("/pages/id/{id}")
    public ResponseEntity<?> updatePageById(
            @PathVariable Long id,
            @RequestBody WikiPageDto.Request.Update request, 
            HttpSession session) {
        try {
            // 로그인 확인
            UserDto.Response.Login user = (UserDto.Response.Login) session.getAttribute("user");
            if (user == null) {
                return ResponseEntity.status(401).body("로그인이 필요합니다.");
            }
            
            WikiPageDto.Response.Detail updatedPage = wikiPageService.updatePageById(id, request, user.getStaffId(), user.getUserName());
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

    @DeleteMapping("/pages/id/{id}")
    public ResponseEntity<Void> deletePageById(@PathVariable Long id) {
        wikiPageService.deletePageById(id);
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

    @PostMapping("/pages/{id}/history/{seqNbr}/restore")
    public ResponseEntity<?> restoreHistory(@PathVariable Long id, @PathVariable Integer seqNbr, HttpSession session) {
        try {
            // 로그인 확인
            UserDto.Response.Login user = (UserDto.Response.Login) session.getAttribute("user");
            if (user == null) {
                return ResponseEntity.status(401).body("로그인이 필요합니다.");
            }
            
            WikiPageDto.Response.Detail restoredPage = wikiPageService.restoreHistory(id, seqNbr, user.getStaffId());
            return ResponseEntity.ok(restoredPage);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("히스토리 복원 실패: " + e.getMessage());
        }
    }

    /**
     * 기존 데이터의 누락된 staff name 채우기 (임시 마이그레이션용)
     */
    @PostMapping("/fix-staff-names")
    public ResponseEntity<String> fixStaffNames(HttpSession session) {
        try {
            // 로그인 확인
            UserDto.Response.Login user = (UserDto.Response.Login) session.getAttribute("user");
            if (user == null) {
                return ResponseEntity.status(401).body("로그인이 필요합니다.");
            }
            
            wikiPageService.fillMissingStaffNames();
            return ResponseEntity.ok("누락된 staff name 업데이트 완료");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("staff name 업데이트 실패: " + e.getMessage());
        }
    }
    
    /**
     * Y.js 동시편집 콘텐츠 업데이트
     * WebSocket 핸들러에서 호출되는 내부 API
     */
    @PostMapping("/{id}/content-sync")
    public ResponseEntity<Map<String, Object>> updateContentSync(
            @PathVariable Long id,
            @RequestBody Map<String, String> payload) {
        try {
            String content = payload.get("content");
            if (content == null) {
                return ResponseEntity.badRequest()
                    .body(Map.of("success", false, "message", "Content is required"));
            }
            
            // Y.js 자동 저장으로 컨텐츠만 업데이트 (수정자 정보는 변경하지 않음)
            boolean success = wikiPageService.updateContent(id, content);
            
            if (success) {
                return ResponseEntity.ok(Map.of(
                    "success", true,
                    "pageId", id,
                    "timestamp", System.currentTimeMillis()
                ));
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            log.error("Y.js 콘텐츠 동기화 실패: pageId={}, error={}", id, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("success", false, "message", e.getMessage()));
        }
    }
} 