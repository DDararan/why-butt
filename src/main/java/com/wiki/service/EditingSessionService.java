package com.wiki.service;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 편집 세션 관리 서비스
 * 여러 사용자가 동시에 편집하는 페이지의 상태를 관리합니다.
 */
@Service
public class EditingSessionService {
    
    // 페이지별 편집 중인 사용자 목록
    private final Map<Long, Set<EditingUser>> pageEditingSessions = new ConcurrentHashMap<>();
    
    // 세션 ID별 편집 중인 페이지 추적
    private final Map<String, Set<Long>> sessionToPages = new ConcurrentHashMap<>();
    
    /**
     * 사용자가 페이지 편집 시작
     */
    public synchronized List<EditingUser> startEditing(Long pageId, String sessionId, String staffId, String userName) {
        EditingUser user = new EditingUser(sessionId, staffId, userName, LocalDateTime.now());
        
        // 페이지별 편집 사용자 목록에 추가
        pageEditingSessions.computeIfAbsent(pageId, k -> ConcurrentHashMap.newKeySet()).add(user);
        
        // 세션별 페이지 목록에 추가
        sessionToPages.computeIfAbsent(sessionId, k -> ConcurrentHashMap.newKeySet()).add(pageId);
        
        return getCurrentEditors(pageId);
    }
    
    /**
     * 사용자가 페이지 편집 종료
     */
    public synchronized List<EditingUser> stopEditing(Long pageId, String sessionId) {
        Set<EditingUser> editors = pageEditingSessions.get(pageId);
        if (editors != null) {
            editors.removeIf(user -> user.getSessionId().equals(sessionId));
            if (editors.isEmpty()) {
                pageEditingSessions.remove(pageId);
            }
        }
        
        Set<Long> pages = sessionToPages.get(sessionId);
        if (pages != null) {
            pages.remove(pageId);
            if (pages.isEmpty()) {
                sessionToPages.remove(sessionId);
            }
        }
        
        return getCurrentEditors(pageId);
    }
    
    /**
     * 세션 종료 시 모든 편집 정보 제거
     */
    public synchronized void removeSession(String sessionId) {
        Set<Long> pages = sessionToPages.remove(sessionId);
        if (pages != null) {
            for (Long pageId : pages) {
                Set<EditingUser> editors = pageEditingSessions.get(pageId);
                if (editors != null) {
                    editors.removeIf(user -> user.getSessionId().equals(sessionId));
                    if (editors.isEmpty()) {
                        pageEditingSessions.remove(pageId);
                    }
                }
            }
        }
    }
    
    /**
     * 현재 특정 페이지를 편집 중인 사용자 목록 조회
     */
    public List<EditingUser> getCurrentEditors(Long pageId) {
        Set<EditingUser> editors = pageEditingSessions.get(pageId);
        return editors != null ? new ArrayList<>(editors) : new ArrayList<>();
    }
    
    /**
     * 하트비트로 세션 유지 (5분 이상 비활성 세션 제거)
     */
    public synchronized void updateHeartbeat(String sessionId, String staffId) {
        Set<Long> pages = sessionToPages.get(sessionId);
        if (pages != null) {
            LocalDateTime now = LocalDateTime.now();
            for (Long pageId : pages) {
                Set<EditingUser> editors = pageEditingSessions.get(pageId);
                if (editors != null) {
                    for (EditingUser user : editors) {
                        if (user.getSessionId().equals(sessionId) && user.getStaffId().equals(staffId)) {
                            user.setLastActivity(now);
                        }
                    }
                }
            }
        }
    }
    
    /**
     * 비활성 세션 정리 (5분 이상 비활성)
     */
    public synchronized void cleanupInactiveSessions() {
        LocalDateTime cutoff = LocalDateTime.now().minusMinutes(5);
        
        // 만료된 세션 수집
        Set<String> expiredSessions = new HashSet<>();
        for (Map.Entry<Long, Set<EditingUser>> entry : pageEditingSessions.entrySet()) {
            entry.getValue().removeIf(user -> {
                if (user.getLastActivity().isBefore(cutoff)) {
                    expiredSessions.add(user.getSessionId());
                    return true;
                }
                return false;
            });
            
            if (entry.getValue().isEmpty()) {
                pageEditingSessions.remove(entry.getKey());
            }
        }
        
        // 만료된 세션 정리
        for (String sessionId : expiredSessions) {
            sessionToPages.remove(sessionId);
        }
    }
    
    @Data
    public static class EditingUser {
        private final String sessionId;
        private final String staffId;
        private final String userName;
        
        @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss")
        private LocalDateTime lastActivity;
        
        public EditingUser(String sessionId, String staffId, String userName, LocalDateTime lastActivity) {
            this.sessionId = sessionId;
            this.staffId = staffId;
            this.userName = userName;
            this.lastActivity = lastActivity;
        }
        
        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (!(o instanceof EditingUser)) return false;
            EditingUser that = (EditingUser) o;
            return Objects.equals(sessionId, that.sessionId) && Objects.equals(staffId, that.staffId);
        }
        
        @Override
        public int hashCode() {
            return Objects.hash(sessionId, staffId);
        }
    }
} 