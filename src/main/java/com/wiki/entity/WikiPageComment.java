package com.wiki.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * 위키 페이지 댓글 엔티티
 * SOLID 원칙에 따라 댓글 데이터의 단일 책임을 담당
 * FK 없이 단순하게 WIKI_PAGE_ID로 연관관계 관리
 */
@Entity
@Table(name = "wiki_page_comment")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class WikiPageComment {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "comment_id")
    private Long commentId;
    
    @Column(name = "wiki_page_id", nullable = false)
    private Long wikiPageId;
    
    @Column(name = "content", nullable = false, length = 2000)
    private String content;
    
    @Column(name = "staff_id", nullable = false, length = 20)
    private String staffId;
    
    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @Column(name = "del_yn", nullable = false, length = 1)
    private String delYn = "N";
    
    /**
     * 댓글 생성 생성자
     * 
     * @param wikiPageId 페이지 ID
     * @param content 댓글 내용
     * @param staffId 작성자 STAFF_ID
     */
    public WikiPageComment(Long wikiPageId, String content, String staffId) {
        this.wikiPageId = wikiPageId;
        this.content = content;
        this.staffId = staffId;
        this.delYn = "N";
        this.updatedAt = LocalDateTime.now();
    }
    
    /**
     * 논리 삭제 처리
     */
    public void delete() {
        this.delYn = "Y";
        this.updatedAt = LocalDateTime.now();
    }
    
    /**
     * 댓글 수정
     * 
     * @param newContent 새로운 댓글 내용
     */
    public void updateContent(String newContent) {
        this.content = newContent;
        this.updatedAt = LocalDateTime.now();
    }
} 