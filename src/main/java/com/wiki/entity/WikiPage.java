package com.wiki.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Getter
@Setter
@EntityListeners(AuditingEntityListener.class)
public class WikiPage {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String content;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id", foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT))
    private WikiPage parent;

    @OneToMany(mappedBy = "parent", cascade = CascadeType.ALL)
    private List<WikiPage> children = new ArrayList<>();



    @Column(nullable = false)
    private Integer depth = 0;

    @Column(nullable = false)
    private String path = "/";

    @Column(nullable = false)
    private Integer displayOrder = 0;

    @Column(name = "page_type", nullable = false, columnDefinition = "varchar(50) default 'MENU'")
    private String pageType = "MENU";

    @Column(name = "creation_staff_id", length = 20)
    private String creationStaffId;

    @Column(name = "modify_staff_id", length = 20)
    private String modifyStaffId;

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    public void addChild(WikiPage child) {
        this.children.add(child);
        child.setParent(this);
        child.setDepth(this.depth + 1);
        child.setPath(this.path + this.id + "/");
    }

    public void removeChild(WikiPage child) {
        this.children.remove(child);
        child.setParent(null);
    }
} 