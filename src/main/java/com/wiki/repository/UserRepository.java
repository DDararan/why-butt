package com.wiki.repository;

import com.wiki.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * 사용자 정보 접근을 위한 Repository
 * SOLID 원칙에 따라 사용자 데이터 접근 로직을 분리
 */
@Repository
public interface UserRepository extends JpaRepository<User, String> {
    
    /**
     * 로그인 ID로 사용자 조회
     * 
     * @param loginId 로그인 ID
     * @return 사용자 정보 (Optional)
     */
    Optional<User> findByLoginId(String loginId);
    
    /**
     * 활성 사용자 여부 확인 (로그인 ID + 활성 상태)
     * 
     * @param loginId 로그인 ID
     * @param isActive 활성 여부
     * @return 사용자 정보 (Optional)
     */
    Optional<User> findByLoginIdAndIsActive(String loginId, Boolean isActive);
    
    /**
     * 로그인 ID 중복 확인
     * 
     * @param loginId 로그인 ID
     * @return 존재 여부
     */
    boolean existsByLoginId(String loginId);
} 