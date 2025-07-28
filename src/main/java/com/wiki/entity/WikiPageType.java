package com.wiki.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@EntityListeners(AuditingEntityListener.class)
@Table(name = "WIKI_PAGE_TYPE")
public class WikiPageType {
    @Id
    @Column(name = "PAGE_TYPE", length = 50)
    private String pageType;

    @Column(name = "PAGE_TITLE", nullable = false, length = 100)
    private String pageTitle;

    @Column(name = "creation_staff_id", length = 20)
    private String creationStaffId;

    @Column(name = "modify_staff_id", length = 20)
    private String modifyStaffId;

    @CreatedDate
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
} 