package com.wiki.repository;

import com.wiki.entity.WikiPageComment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 위키 페이지 댓글 Repository
 * SOLID 원칙에 따라 데이터 접근 로직을 분리
 */
@Repository
public interface WikiPageCommentRepository extends JpaRepository<WikiPageComment, Long> {
    
    /**
     * 특정 페이지의 활성 댓글 조회 (논리삭제 제외)
     * 
     * @param wikiPageId 페이지 ID
     * @return 활성 댓글 목록 (최신순)
     */
    @Query("SELECT c FROM WikiPageComment c WHERE c.wikiPageId = :wikiPageId AND c.delYn = 'N' ORDER BY c.updatedAt DESC")
    List<WikiPageComment> findActiveCommentsByPageId(@Param("wikiPageId") Long wikiPageId);
    
    /**
     * 특정 페이지의 활성 댓글 개수
     * 
     * @param wikiPageId 페이지 ID
     * @return 댓글 개수
     */
    @Query("SELECT COUNT(c) FROM WikiPageComment c WHERE c.wikiPageId = :wikiPageId AND c.delYn = 'N'")
    long countActiveCommentsByPageId(@Param("wikiPageId") Long wikiPageId);
    
    /**
     * 특정 사용자의 활성 댓글 조회
     * 
     * @param staffId 작성자 STAFF_ID
     * @return 사용자의 댓글 목록 (최신순)
     */
    @Query("SELECT c FROM WikiPageComment c WHERE c.staffId = :staffId AND c.delYn = 'N' ORDER BY c.updatedAt DESC")
    List<WikiPageComment> findActiveCommentsByStaffId(@Param("staffId") String staffId);
    
    /**
     * 특정 댓글 조회 (논리삭제 제외)
     * 
     * @param commentId 댓글 ID
     * @return 댓글 (논리삭제되지 않은 경우)
     */
    @Query("SELECT c FROM WikiPageComment c WHERE c.commentId = :commentId AND c.delYn = 'N'")
    WikiPageComment findActiveCommentById(@Param("commentId") Long commentId);
} 