package com.wiki.service;

import com.wiki.entity.WikiPageComment;
import com.wiki.repository.WikiPageCommentRepository;
import com.wiki.dto.WikiPageCommentDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * 위키 페이지 댓글 서비스
 * SOLID 원칙에 따라 댓글 비즈니스 로직을 담당
 * 단일 책임: 댓글 CRUD 및 검증 로직만 처리
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class WikiPageCommentService {
    
    private final WikiPageCommentRepository commentRepository;
    
    /**
     * 특정 페이지의 댓글 목록 조회
     * 
     * @param pageId 페이지 ID
     * @return 댓글 목록 응답
     */
    public WikiPageCommentDto.CommentListResponse getCommentsByPageId(Long pageId) {
        log.debug("페이지 ID {}의 댓글 목록 조회", pageId);
        
        List<WikiPageComment> comments = commentRepository.findActiveCommentsByPageId(pageId);
        long totalCount = commentRepository.countActiveCommentsByPageId(pageId);
        
        List<WikiPageCommentDto.Response> commentResponses = comments.stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
        
        return new WikiPageCommentDto.CommentListResponse(commentResponses, totalCount);
    }
    
    /**
     * 댓글 생성
     * 
     * @param pageId 페이지 ID
     * @param request 댓글 생성 요청
     * @param staffId 작성자 STAFF_ID
     * @return 생성된 댓글 응답
     * @throws IllegalArgumentException 입력값이 유효하지 않은 경우
     */
    @Transactional
    public WikiPageCommentDto.Response createComment(Long pageId, 
                                                   WikiPageCommentDto.CreateRequest request, 
                                                   String staffId) {
        log.debug("댓글 생성 요청 - 페이지ID: {}, 작성자: {}", pageId, staffId);
        
        // 입력값 검증
        if (!request.isValid()) {
            throw new IllegalArgumentException("댓글 내용이 유효하지 않습니다.");
        }
        
        if (staffId == null || staffId.trim().isEmpty()) {
            throw new IllegalArgumentException("작성자 정보가 필요합니다.");
        }
        
        // 댓글 생성 및 저장
        WikiPageComment comment = new WikiPageComment(pageId, request.getContent().trim(), staffId);
        WikiPageComment savedComment = commentRepository.save(comment);
        
        log.info("댓글 생성 완료 - ID: {}, 페이지ID: {}", savedComment.getCommentId(), pageId);
        
        return convertToDto(savedComment);
    }
    
    /**
     * 댓글 수정
     * 
     * @param commentId 댓글 ID
     * @param request 댓글 수정 요청
     * @param staffId 수정 요청자 STAFF_ID
     * @return 수정된 댓글 응답
     * @throws IllegalArgumentException 입력값이 유효하지 않거나 권한이 없는 경우
     * @throws RuntimeException 댓글을 찾을 수 없는 경우
     */
    @Transactional
    public WikiPageCommentDto.Response updateComment(Long commentId, 
                                                   WikiPageCommentDto.UpdateRequest request, 
                                                   String staffId) {
        log.debug("댓글 수정 요청 - 댓글ID: {}, 수정자: {}", commentId, staffId);
        
        // 입력값 검증
        if (!request.isValid()) {
            throw new IllegalArgumentException("댓글 내용이 유효하지 않습니다.");
        }
        
        // 댓글 조회
        WikiPageComment comment = commentRepository.findActiveCommentById(commentId);
        if (comment == null) {
            throw new RuntimeException("댓글을 찾을 수 없습니다.");
        }
        
        // 작성자 권한 확인
        if (!comment.getStaffId().equals(staffId)) {
            throw new IllegalArgumentException("댓글을 수정할 권한이 없습니다.");
        }
        
        // 댓글 수정
        comment.updateContent(request.getContent().trim());
        WikiPageComment updatedComment = commentRepository.save(comment);
        
        log.info("댓글 수정 완료 - ID: {}", commentId);
        
        return convertToDto(updatedComment);
    }
    
    /**
     * 댓글 삭제 (논리삭제)
     * 
     * @param commentId 댓글 ID
     * @param staffId 삭제 요청자 STAFF_ID
     * @throws IllegalArgumentException 권한이 없는 경우
     * @throws RuntimeException 댓글을 찾을 수 없는 경우
     */
    @Transactional
    public void deleteComment(Long commentId, String staffId) {
        log.debug("댓글 삭제 요청 - 댓글ID: {}, 삭제자: {}", commentId, staffId);
        
        // 댓글 조회
        WikiPageComment comment = commentRepository.findActiveCommentById(commentId);
        if (comment == null) {
            throw new RuntimeException("댓글을 찾을 수 없습니다.");
        }
        
        // 작성자 권한 확인
        if (!comment.getStaffId().equals(staffId)) {
            throw new IllegalArgumentException("댓글을 삭제할 권한이 없습니다.");
        }
        
        // 논리 삭제 처리
        comment.delete();
        commentRepository.save(comment);
        
        log.info("댓글 삭제 완료 - ID: {}", commentId);
    }
    
    /**
     * 댓글 엔티티를 DTO로 변환
     * 
     * @param comment 댓글 엔티티
     * @return 댓글 응답 DTO
     */
    private WikiPageCommentDto.Response convertToDto(WikiPageComment comment) {
        return new WikiPageCommentDto.Response(
            comment.getCommentId(),
            comment.getWikiPageId(),
            comment.getContent(),
            comment.getStaffId(),
            comment.getUpdatedAt()
        );
    }
} 