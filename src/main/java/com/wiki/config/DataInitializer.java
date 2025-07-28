package com.wiki.config;

import com.wiki.entity.User;
import com.wiki.entity.WikiPageComment;
import com.wiki.entity.WikiPageType;
import com.wiki.repository.UserRepository;
import com.wiki.repository.WikiPageCommentRepository;
import com.wiki.repository.WikiPageTypeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/**
 * 애플리케이션 시작 시 초기 데이터를 설정하는 컴포넌트
 * SOLID 원칙에 따라 데이터 초기화 책임을 분리
 */
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {
    
    private final UserRepository userRepository;
    private final WikiPageCommentRepository commentRepository;
    private final WikiPageTypeRepository wikiPageTypeRepository;
    
    @Override
    public void run(String... args) throws Exception {
        initializeUsers();
        initializePageTypes();
        initializeSampleComments();
    }
    
    /**
     * 기본 사용자 계정 초기화
     * 시스템 관리자 계정과 테스트 계정을 생성
     */
    private void initializeUsers() {
        System.out.println("사용자 계정 초기화 시작");
        
        // 관리자 계정 생성
        if (!userRepository.existsByLoginId("admin")) {
            User adminUser = new User(
                "ADMIN001",
                "admin",
                "admin123", // 실제 환경에서는 암호화 필요
                "시스템 관리자"
            );
            adminUser.setEmail("admin@company.com");
            userRepository.save(adminUser);
            System.out.println("관리자 계정 생성 완료: admin/admin123");
        }
        
        // 테스트 사용자 계정 생성
        if (!userRepository.existsByLoginId("user1")) {
            User testUser = new User(
                "USR001",
                "user1",
                "user123", // 실제 환경에서는 암호화 필요
                "테스트 사용자"
            );
            testUser.setEmail("user1@company.com");
            userRepository.save(testUser);
            System.out.println("테스트 사용자 계정 생성 완료: user1/user123");
        }
        
        System.out.println("사용자 계정 초기화 완료");
    }
    
    /**
     * 기본 페이지 타입 초기화
     * 메뉴, 일자별, 기타 페이지 타입을 생성
     */
    private void initializePageTypes() {
        System.out.println("페이지 타입 초기화 시작");
        
        // MENU 타입
        if (!wikiPageTypeRepository.existsByPageType("MENU")) {
            WikiPageType menuType = new WikiPageType();
            menuType.setPageType("MENU");
            menuType.setPageTitle("메뉴");
            menuType.setCreationStaffId("ADMIN001");
            menuType.setModifyStaffId("ADMIN001");
            wikiPageTypeRepository.save(menuType);
            System.out.println("MENU 페이지 타입 생성 완료");
        }
        
        // DAILY 타입
        if (!wikiPageTypeRepository.existsByPageType("DAILY")) {
            WikiPageType dailyType = new WikiPageType();
            dailyType.setPageType("DAILY");
            dailyType.setPageTitle("일자별");
            dailyType.setCreationStaffId("ADMIN001");
            dailyType.setModifyStaffId("ADMIN001");
            wikiPageTypeRepository.save(dailyType);
            System.out.println("DAILY 페이지 타입 생성 완료");
        }
        
        // ETC 타입
        if (!wikiPageTypeRepository.existsByPageType("ETC")) {
            WikiPageType etcType = new WikiPageType();
            etcType.setPageType("ETC");
            etcType.setPageTitle("기타");
            etcType.setCreationStaffId("ADMIN001");
            etcType.setModifyStaffId("ADMIN001");
            wikiPageTypeRepository.save(etcType);
            System.out.println("ETC 페이지 타입 생성 완료");
        }
        
        System.out.println("페이지 타입 초기화 완료");
    }
    
    /**
     * 샘플 댓글 데이터 초기화
     * 테스트용 댓글 데이터를 생성
     */
    private void initializeSampleComments() {
        System.out.println("샘플 댓글 데이터 초기화 시작");
        
        try {
            // 기존 댓글이 없는 경우에만 샘플 댓글 생성
            long existingComments = commentRepository.count();
            
            if (existingComments == 0) {
                // 페이지 1에 대한 샘플 댓글들
                WikiPageComment comment1 = new WikiPageComment(1L, "첫 번째 댓글입니다. 좋은 내용이네요!", "ADMIN001");
                commentRepository.save(comment1);
                
                WikiPageComment comment2 = new WikiPageComment(1L, "두 번째 댓글입니다. 추가 정보가 있으면 좋겠어요.", "USR001");
                commentRepository.save(comment2);
                
                // 페이지 2에 대한 샘플 댓글
                WikiPageComment comment3 = new WikiPageComment(2L, "이 문서는 정말 유용합니다.", "USR001");
                commentRepository.save(comment3);
                
                System.out.println("샘플 댓글 " + 3 + "개 생성 완료");
            } else {
                System.out.println("이미 댓글 데이터가 존재합니다 (총 " + existingComments + "개)");
            }
        } catch (Exception e) {
            System.err.println("샘플 댓글 초기화 중 오류 발생: " + e.getMessage());
        }
        
        System.out.println("샘플 댓글 데이터 초기화 완료");
    }
} 