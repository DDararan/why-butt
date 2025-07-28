package com.wiki.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * FileAttachment 엔티티
 * 위키 페이지에 첨부된 파일 정보를 저장합니다.
 * WikiPage와 다대일 관계를 가지며, 파일의 메타데이터를 관리합니다.
 */
@Entity
@Table(name = "file_attachments")
@Data
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class FileAttachment {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false, length = 255)
    private String originalFileName;
    
    @Column(nullable = false, length = 255)
    private String storedFileName;
    
    @Column(nullable = false, length = 500)
    private String filePath;
    
    @Column(nullable = false)
    private Long fileSize;
    
    @Column(nullable = false, length = 100)
    private String contentType;
    
    @Column(nullable = false, length = 100)
    private String uploadedBy;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "wiki_page_id", nullable = true, foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT))
    private WikiPage wikiPage;
    
    @CreatedDate
    @Column(name = "uploaded_at", nullable = false, updatable = false)
    private LocalDateTime uploadedAt;
} 