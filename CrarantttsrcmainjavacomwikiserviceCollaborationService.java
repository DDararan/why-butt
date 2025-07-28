package com.wiki.service;

import com.wiki.websocket.YjsDocument;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 협업 편집 서비스
 * Y.js 문서의 최신 HTML 내용을 관리합니다.
 */
@Service
public class CollaborationService {
    private static final Logger logger = LoggerFactory.getLogger(CollaborationService.class);
    
    @Autowired
    private WikiPageService wikiPageService;
    
    // pageId -> 최신 HTML 내용 매핑
    private final Map<Long, String> latestContents = new ConcurrentHashMap<>();
    
    /**
     * 페이지의 최신 내용 업데이트
     * 
     * @param pageId 페이지 ID
     * @param htmlContent HTML 형식의 내용
     */
    public void updateContent(Long pageId, String htmlContent) {
        latestContents.put(pageId, htmlContent);
        logger.debug("페이지 {} 내용 업데이트 (메모리)", pageId);
    }
    
    /**
     * 페이지의 최신 내용 가져오기
     * 메모리에 없으면 DB에서 가져옵니다.
     * 
     * @param pageId 페이지 ID
     * @return 최신 HTML 내용
     */
    public String getLatestContent(Long pageId) {
        String content = latestContents.get(pageId);
        if (content \!= null) {
            logger.debug("페이지 {} 내용 메모리에서 반환", pageId);
            return content;
        }
        
        // 메모리에 없으면 DB에서 가져오기
        try {
            var page = wikiPageService.getPageById(pageId);
            if (page \!= null) {
                logger.debug("페이지 {} 내용 DB에서 반환", pageId);
                return page.getContent();
            }
        } catch (Exception e) {
            logger.error("페이지 {} DB 조회 실패: {}", pageId, e.getMessage());
        }
        
        return "";
    }
    
    /**
     * 메모리의 내용을 DB에 저장
     * 
     * @param pageId 페이지 ID
     */
    public void persistToDatabase(Long pageId) {
        String content = latestContents.get(pageId);
        if (content \!= null) {
            boolean saved = wikiPageService.updateContent(pageId, content);
            if (saved) {
                logger.info("페이지 {} 내용 DB 저장 완료", pageId);
            }
        }
    }
    
    /**
     * 페이지 편집 종료 시 메모리에서 제거
     * 
     * @param pageId 페이지 ID
     */
    public void clearContent(Long pageId) {
        // DB에 최종 저장
        persistToDatabase(pageId);
        // 메모리에서 제거
        latestContents.remove(pageId);
        logger.debug("페이지 {} 메모리에서 제거", pageId);
    }
}
