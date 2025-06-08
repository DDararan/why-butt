package com.wiki.repository;

import com.wiki.entity.WikiPageHistory;
import com.wiki.entity.WikiPageHistoryId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WikiPageHistoryRepository extends JpaRepository<WikiPageHistory, WikiPageHistoryId> {
    
    // 특정 페이지의 모든 히스토리 조회 (최신순)
    List<WikiPageHistory> findByIdOrderBySeqNbrDesc(Long id);
    
    // 특정 페이지의 최신 시퀀스 번호 조회
    @Query("SELECT MAX(h.seqNbr) FROM WikiPageHistory h WHERE h.id = :id")
    Optional<Integer> findMaxSeqNbrById(@Param("id") Long id);
    
    // 특정 페이지의 특정 버전 조회
    Optional<WikiPageHistory> findByIdAndSeqNbr(Long id, Integer seqNbr);
    
    // 특정 페이지의 모든 히스토리 삭제
    @Modifying
    @Query("DELETE FROM WikiPageHistory h WHERE h.id = :id")
    void deleteByPageId(@Param("id") Long id);
} 