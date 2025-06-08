package com.wiki.controller;

import com.wiki.dto.WikiPageCommentDto;
import com.wiki.service.WikiPageCommentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpSession;

/**
 * 위키 페이지 댓글 컨트롤러
 * SOLID 원칙에 따라 HTTP 요청 처리와 인증 검증 담당
 * 단일 책임: API 요청/응답 처리 및 세션 기반 인증
 */
@RestController
@RequestMapping("/api/wiki-pages/{pageId}/comments")
@RequiredArgsConstructor
@Slf4j
public class WikiPageCommentController {
    
    private final WikiPageCommentService commentService;
    
    /**
     * 페이지별 댓글 목록 조회
     * 인증 불필요 (읽기 전용)
     * 
     * @param pageId 페이지 ID
     * @return 댓글 목록 응답
     */
    @GetMapping
    public ResponseEntity<WikiPageCommentDto.CommentListResponse> getComments(@PathVariable Long pageId) {
        log.debug("페이지 {}의 댓글 목록 조회 요청", pageId);
        
        try {
            WikiPageCommentDto.CommentListResponse response = commentService.getCommentsByPageId(pageId);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("댓글 목록 조회 실패 - 페이지ID: {}", pageId, e);
            return ResponseEntity.internalServerError().build();
        }
    }
    
    /**
     * 댓글 생성
     * 로그인 필요
     * 
     * @param pageId 페이지 ID
     * @param request 댓글 생성 요청
     * @param session HTTP 세션
     * @return 생성된 댓글 응답
     */
    @PostMapping
    public ResponseEntity<WikiPageCommentDto.Response> createComment(
            @PathVariable Long pageId,
            @RequestBody WikiPageCommentDto.CreateRequest request,
            HttpSession session) {
        
        log.debug("댓글 생성 요청 - 페이지ID: {}", pageId);
        
        // 인증 확인
        String staffId = (String) session.getAttribute("staffId");
        log.debug("세션에서 조회한 staffId: {}", staffId);
        if (staffId == null) {
            log.warn("미인증 사용자의 댓글 생성 시도 - 페이지ID: {}", pageId);
            return ResponseEntity.status(401).build();
        }
        
        try {
            WikiPageCommentDto.Response response = commentService.createComment(pageId, request, staffId);
            log.info("댓글 생성 성공 - 댓글ID: {}, 작성자: {}", response.getCommentId(), staffId);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            log.warn("댓글 생성 실패 - 잘못된 요청: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            log.error("댓글 생성 실패 - 페이지ID: {}, 작성자: {}", pageId, staffId, e);
            return ResponseEntity.internalServerError().build();
        }
    }
    
    /**
     * 댓글 수정
     * 로그인 및 작성자 권한 필요
     * 
     * @param pageId 페이지 ID (사용하지 않지만 URL 일관성을 위해 유지)
     * @param commentId 댓글 ID
     * @param request 댓글 수정 요청
     * @param session HTTP 세션
     * @return 수정된 댓글 응답
     */
    @PutMapping("/{commentId}")
    public ResponseEntity<WikiPageCommentDto.Response> updateComment(
            @PathVariable Long pageId,
            @PathVariable Long commentId,
            @RequestBody WikiPageCommentDto.UpdateRequest request,
            HttpSession session) {
        
        log.debug("댓글 수정 요청 - 댓글ID: {}", commentId);
        
        // 인증 확인
        String staffId = (String) session.getAttribute("staffId");
        log.debug("세션에서 조회한 staffId: {}", staffId);
        if (staffId == null) {
            log.warn("미인증 사용자의 댓글 수정 시도 - 댓글ID: {}", commentId);
            return ResponseEntity.status(401).build();
        }
        
        try {
            WikiPageCommentDto.Response response = commentService.updateComment(commentId, request, staffId);
            log.info("댓글 수정 성공 - 댓글ID: {}, 수정자: {}", commentId, staffId);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            log.warn("댓글 수정 실패 - 권한 없음 또는 잘못된 요청: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (RuntimeException e) {
            log.warn("댓글 수정 실패 - 댓글을 찾을 수 없음: {}", e.getMessage());
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            log.error("댓글 수정 실패 - 댓글ID: {}, 수정자: {}", commentId, staffId, e);
            return ResponseEntity.internalServerError().build();
        }
    }
    
    /**
     * 댓글 삭제 (논리삭제)
     * 로그인 및 작성자 권한 필요
     * 
     * @param pageId 페이지 ID (사용하지 않지만 URL 일관성을 위해 유지)
     * @param commentId 댓글 ID
     * @param session HTTP 세션
     * @return 삭제 결과
     */
    @DeleteMapping("/{commentId}")
    public ResponseEntity<Void> deleteComment(
            @PathVariable Long pageId,
            @PathVariable Long commentId,
            HttpSession session) {
        
        log.debug("댓글 삭제 요청 - 댓글ID: {}", commentId);
        
        // 인증 확인
        String staffId = (String) session.getAttribute("staffId");
        if (staffId == null) {
            log.warn("미인증 사용자의 댓글 삭제 시도 - 댓글ID: {}", commentId);
            return ResponseEntity.status(401).build();
        }
        
        try {
            commentService.deleteComment(commentId, staffId);
            log.info("댓글 삭제 성공 - 댓글ID: {}, 삭제자: {}", commentId, staffId);
            return ResponseEntity.ok().build();
        } catch (IllegalArgumentException e) {
            log.warn("댓글 삭제 실패 - 권한 없음: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (RuntimeException e) {
            log.warn("댓글 삭제 실패 - 댓글을 찾을 수 없음: {}", e.getMessage());
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            log.error("댓글 삭제 실패 - 댓글ID: {}, 삭제자: {}", commentId, staffId, e);
            return ResponseEntity.internalServerError().build();
        }
    }
} 