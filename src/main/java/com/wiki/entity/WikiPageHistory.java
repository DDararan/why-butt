package com.wiki.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "wiki_page_history")
@IdClass(WikiPageHistoryId.class)
@Getter
@Setter
public class WikiPageHistory {
    
    @Id
    private Long id;
    
    @Id
    @Column(name = "seq_nbr")
    private Integer seqNbr;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String content;

    @Column(name = "parent_id")
    private Long parentId;

    @Column(nullable = false)
    private Integer depth = 0;

    @Column(nullable = false)
    private String path = "/";

    @Column(name = "page_type", nullable = false, columnDefinition = "varchar(50) default 'MENU'")
    private String pageType = "MENU";

    @Column(name = "creation_staff_id", length = 20)
    private String creationStaffId;

    @Column(name = "modify_staff_id", length = 20)
    private String modifyStaffId;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // WikiPage로부터 히스토리 생성하는 생성자
    public WikiPageHistory(WikiPage wikiPage, Integer seqNbr) {
        this.id = wikiPage.getId();
        this.seqNbr = seqNbr;
        this.title = wikiPage.getTitle();
        this.content = wikiPage.getContent();
        this.parentId = wikiPage.getParent() != null ? wikiPage.getParent().getId() : null;
        this.depth = wikiPage.getDepth();
        this.path = wikiPage.getPath();
        this.pageType = wikiPage.getPageType();
        this.creationStaffId = wikiPage.getCreationStaffId();
        this.modifyStaffId = wikiPage.getModifyStaffId();
        this.createdAt = wikiPage.getCreatedAt();
        this.updatedAt = wikiPage.getUpdatedAt();
    }

    // 기본 생성자
    public WikiPageHistory() {}
} 