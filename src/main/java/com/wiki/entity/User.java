package com.wiki.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * 사용자 정보를 관리하는 엔티티
 * STAFF_ID를 기본키로 사용하여 직원 정보를 관리
 */
@Entity
@Table(name = "users")
@Getter
@Setter
@EntityListeners(AuditingEntityListener.class)
public class User {
    
    @Id
    @Column(name = "staff_id", length = 20)
    private String staffId;
    
    @Column(name = "login_id", nullable = false, unique = true, length = 50)
    private String loginId;
    
    @Column(name = "password", nullable = false, length = 255)
    private String password;
    
    @Column(name = "user_name", nullable = false, length = 100)
    private String userName;
    
    @Column(name = "email", length = 100)
    private String email;
    
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;
    
    @CreatedDate
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    /**
     * 기본 생성자
     */
    public User() {}
    
    /**
     * 사용자 생성 생성자
     * 
     * @param staffId 직원ID
     * @param loginId 로그인ID
     * @param password 암호화된 비밀번호
     * @param userName 사용자명
     */
    public User(String staffId, String loginId, String password, String userName) {
        this.staffId = staffId;
        this.loginId = loginId;
        this.password = password;
        this.userName = userName;
        this.isActive = true;
    }
} 