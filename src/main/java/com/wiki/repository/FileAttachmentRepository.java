package com.wiki.repository;

import com.wiki.entity.FileAttachment;
import com.wiki.entity.WikiPage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * FileAttachment Repository
 * 파일 첨부 데이터에 대한 데이터베이스 접근을 담당합니다.
 * 페이지별 파일 조회, 파일명 기반 검색 등의 기능을 제공합니다.
 */
@Repository
public interface FileAttachmentRepository extends JpaRepository<FileAttachment, Long> {
    
    /**
     * 특정 위키 페이지의 모든 첨부 파일을 조회합니다.
     * 업로드 시간 순으로 정렬됩니다.
     */
    List<FileAttachment> findByWikiPageOrderByUploadedAtDesc(WikiPage wikiPage);
    
    /**
     * 특정 위키 페이지의 첨부 파일 개수를 조회합니다.
     */
    long countByWikiPage(WikiPage wikiPage);
    
    /**
     * 저장된 파일명으로 첨부 파일을 조회합니다.
     */
    Optional<FileAttachment> findByStoredFileName(String storedFileName);
    
    /**
     * 특정 사용자가 업로드한 모든 파일을 조회합니다.
     */
    List<FileAttachment> findByUploadedByOrderByUploadedAtDesc(String uploadedBy);
    
    /**
     * 특정 위키 페이지에서 원본 파일명으로 파일을 검색합니다.
     */
    List<FileAttachment> findByWikiPageAndOriginalFileNameContainingIgnoreCase(
            WikiPage wikiPage, String fileName);
} 