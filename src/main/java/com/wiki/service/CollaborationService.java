package com.wiki.service;

import com.wiki.dto.CollaborationTokenDto;
import com.wiki.entity.User;
import com.wiki.entity.WikiPage;
import com.wiki.repository.UserRepository;
import com.wiki.repository.WikiPageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class CollaborationService {
    
    private final UserRepository userRepository;
    private final WikiPageRepository wikiPageRepository;
    
    /**
     * 협업용 토큰 생성
     * 실제 프로덕션에서는 JWT 등을 사용해야 하지만, 데모용으로 간단한 토큰 생성
     */
    public CollaborationTokenDto generateCollaborationToken(String loginId) {
        User user = userRepository.findByLoginId(loginId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다: " + loginId));
        
        // 간단한 토큰 생성 (실제로는 JWT 사용 권장)
        String tokenData = String.format("%s:%s:%d", 
            user.getStaffId(), 
            UUID.randomUUID().toString(),
            System.currentTimeMillis()
        );
        
        String token = Base64.getEncoder()
                .encodeToString(tokenData.getBytes(StandardCharsets.UTF_8));
        
        return CollaborationTokenDto.builder()
                .token(token)
                .userId(0L) // staffId는 문자열이므로 임시로 0 사용
                .username(user.getLoginId())
                .name(user.getUserName())
                .expiresAt(System.currentTimeMillis() + (24 * 60 * 60 * 1000)) // 24시간
                .build();
    }
    
    /**
     * 토큰 검증
     * 실제 프로덕션에서는 더 안전한 검증 로직 필요
     */
    public User validateToken(String token) {
        try {
            String decoded = new String(
                Base64.getDecoder().decode(token), 
                StandardCharsets.UTF_8
            );
            
            String[] parts = decoded.split(":");
            if (parts.length != 3) {
                throw new RuntimeException("유효하지 않은 토큰 형식");
            }
            
            String staffId = parts[0];
            long timestamp = Long.parseLong(parts[2]);
            
            // 토큰 만료 확인 (24시간)
            if (System.currentTimeMillis() - timestamp > (24 * 60 * 60 * 1000)) {
                throw new RuntimeException("토큰이 만료되었습니다");
            }
            
            return userRepository.findById(staffId)
                    .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다"));
                    
        } catch (Exception e) {
            log.error("토큰 검증 실패: {}", e.getMessage());
            throw new RuntimeException("유효하지 않은 토큰입니다");
        }
    }
    
    /**
     * 문서 내용 동기화 (Hocuspocus 서버용)
     * 세션 인증 없이 직접 문서 내용 업데이트
     */
    @Transactional
    public void syncDocumentContent(Long pageId, String content) {
        WikiPage page = wikiPageRepository.findById(pageId)
                .orElseThrow(() -> new RuntimeException("페이지를 찾을 수 없습니다: " + pageId));
        
        // 내용만 업데이트 (수정자 정보는 시스템으로 설정)
        page.setContent(content);
        
        // 수정자를 시스템 사용자로 설정 (실제로는 협업 사용자 정보를 사용해야 함)
        page.setModifyStaffId("SYSTEM");
        
        wikiPageRepository.save(page);
        log.info("문서 동기화 완료: pageId={}, contentLength={}", pageId, content.length());
    }
}