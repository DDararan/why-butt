package com.wiki.repository;

import com.wiki.entity.WikiPage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface WikiPageRepository extends JpaRepository<WikiPage, Long> {
    Optional<WikiPage> findByTitle(String title);
    void deleteByTitle(String title);
    List<WikiPage> findTop10ByOrderByUpdatedAtDesc();
    List<WikiPage> findByTitleContainingIgnoreCaseOrContentContainingIgnoreCase(String titleQuery, String contentQuery);
    boolean existsByTitle(String title);
    List<WikiPage> findByParentIsNullOrderByUpdatedAtDesc();
    List<WikiPage> findByParentIsNullOrderByDisplayOrderAscUpdatedAtDesc();
    List<WikiPage> findByParentOrderByDisplayOrderAscUpdatedAtDesc(WikiPage parent);
    List<WikiPage> findByTitleContainingIgnoreCase(String query);
    
    /**
     * 최근 일주일 동안 작성된 페이지 조회
     */
    @Query("SELECT w FROM WikiPage w WHERE w.createdAt >= :startDate ORDER BY w.createdAt DESC")
    List<WikiPage> findPagesCreatedAfter(@Param("startDate") LocalDateTime startDate);
    
    // PAGE_TYPE별 조회
    List<WikiPage> findByPageTypeAndParentIsNullOrderByDisplayOrderAsc(String pageType);
    List<WikiPage> findByPageTypeOrderByUpdatedAtDesc(String pageType);
} 