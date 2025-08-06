package com.wiki.service;

import com.wiki.dto.WikiPageDto;
import com.wiki.entity.WikiPage;
import com.wiki.entity.WikiPageHistory;
import com.wiki.entity.FileAttachment;
import com.wiki.repository.WikiPageRepository;
import com.wiki.repository.WikiPageHistoryRepository;
import com.wiki.repository.FileAttachmentRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.HtmlUtils;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WikiPageService {
    private final WikiPageRepository wikiPageRepository;
    private final WikiPageHistoryRepository wikiPageHistoryRepository;
    private final FileAttachmentRepository fileAttachmentRepository;

    public List<WikiPageDto.Response.Summary> getRecentPages() {
        List<WikiPage> rootPages = wikiPageRepository.findByParentIsNullOrderByDisplayOrderAscUpdatedAtDesc();
        
        // 자식 페이지들을 명시적으로 로딩
        for (WikiPage page : rootPages) {
            loadChildrenRecursively(page);
        }
        
        List<WikiPageDto.Response.Summary> result = new ArrayList<>();
        for (WikiPage page : rootPages) {
            result.add(convertToSummary(page));
        }
        return result;
    }
    
    /**
     * 최근 일주일 동안 작성된 모든 페이지를 조회합니다.
     * 
     * @return 최근 일주일 동안 작성된 페이지 목록
     */
    public List<WikiPageDto.Response.Summary> getRecentWeekPages() {
        System.out.println("최근 일주일 페이지 조회 요청");
        
        // 일주일 전 날짜 계산
        LocalDateTime oneWeekAgo = LocalDateTime.now().minusDays(7);
        System.out.println("일주일 전 날짜: " + oneWeekAgo);
        
        List<WikiPage> recentPages = wikiPageRepository.findPagesCreatedAfter(oneWeekAgo);
        System.out.println("최근 일주일 페이지 수: " + recentPages.size());
        
        List<WikiPageDto.Response.Summary> result = new ArrayList<>();
        for (WikiPage page : recentPages) {
            result.add(convertToSummary(page));
        }
        
        return result;
    }

    public WikiPageDto.Response.Detail getPage(String title) {
        Optional<WikiPage> pageOptional = wikiPageRepository.findByTitle(title);
        if (pageOptional.isPresent()) {
            WikiPage page = pageOptional.get();
            // 페이지 히스토리 조회
            List<WikiPageHistory> historyList = wikiPageHistoryRepository.findByIdOrderBySeqNbrDesc(page.getId());
            return convertToDetail(page, historyList);
        } else {
            throw new EntityNotFoundException("Page not found: " + title);
        }
    }

    public WikiPageDto.Response.Detail getPageById(Long id) {
        Optional<WikiPage> pageOptional = wikiPageRepository.findById(id);
        if (pageOptional.isPresent()) {
            WikiPage page = pageOptional.get();
            // 페이지 히스토리 조회
            List<WikiPageHistory> historyList = wikiPageHistoryRepository.findByIdOrderBySeqNbrDesc(page.getId());
            return convertToDetail(page, historyList);
        } else {
            throw new EntityNotFoundException("Page not found with id: " + id);
        }
    }

    @Transactional
    public WikiPageDto.Response.Detail createPage(WikiPageDto.Request.Create request, String currentUserStaffId, String currentUserStaffName) {
        WikiPage page = new WikiPage();
        page.setTitle(request.getTitle());
        
        // HTML 특수문자 이스케이프 처리 (< → &lt;, > → &gt; 등)
        // 단, img 태그는 제외
        // 테스트를 위해 임시 주석처리
        // String escapedContent = escapeHtmlExceptImages(request.getContent());
        // log.debug("Content escaping - Original length: {}, Escaped length: {}", 
        //         request.getContent().length(), escapedContent.length());
        // page.setContent(escapedContent);
        page.setContent(request.getContent());
        
        // 작성자 정보 설정
        page.setCreationStaffId(currentUserStaffId);
        page.setCreationStaffName(currentUserStaffName);
        page.setModifyStaffId(currentUserStaffId);
        page.setModifyStaffName(currentUserStaffName);
        
        // 페이지 타입 설정 로직: 최상위 페이지만 직접 타입 선택 가능, 하위 페이지는 부모 타입을 따름
        if (request.getParentId() != null) {
            Optional<WikiPage> parentOptional = wikiPageRepository.findById(request.getParentId());
            if (parentOptional.isPresent()) {
                WikiPage parent = parentOptional.get();
                // 하위 페이지는 부모의 페이지 타입을 상속받음
                page.setPageType(parent.getPageType());
                parent.addChild(page);
            } else {
                throw new EntityNotFoundException("Parent page not found");
            }
        } else {
            // 최상위 페이지만 직접 타입 설정 가능
            page.setPageType(request.getPageType());
        }

        WikiPage savedPage = wikiPageRepository.save(page);
        
        // 초기 히스토리 저장 (시퀀스 1번)
        savePageHistory(savedPage, 1);
        
        return convertToDetail(savedPage);
    }

    @Transactional
    public WikiPageDto.Response.Detail updatePage(Long pageId, WikiPageDto.Request.Update request, String currentUserStaffId, String currentUserStaffName) {
        Optional<WikiPage> pageOptional = wikiPageRepository.findById(pageId);
        WikiPage page;
        if (pageOptional.isPresent()) {
            page = pageOptional.get();
        } else {
            throw new EntityNotFoundException("Page not found with id: " + pageId);
        }

        // 수정자 정보 설정
        page.setModifyStaffId(currentUserStaffId);
        page.setModifyStaffName(currentUserStaffName);

        // 제목 업데이트
        if (request.getTitle() != null && !request.getTitle().trim().isEmpty()) {
            page.setTitle(request.getTitle().trim());
        }
        
        // HTML 특수문자 이스케이프 처리 (< → &lt;, > → &gt; 등)
        // 단, img 태그는 제외
        // 테스트를 위해 임시 주석처리
        // String escapedContent = escapeHtmlExceptImages(request.getContent());
        // log.debug("Content escaping on update - Original length: {}, Escaped length: {}", 
        //         request.getContent().length(), escapedContent.length());
        // page.setContent(escapedContent);
        page.setContent(request.getContent());
        
        // 페이지 타입 업데이트 로직: 최상위 페이지만 직접 타입 변경 가능
        if (page.getParent() == null && request.getPageType() != null && !request.getPageType().trim().isEmpty()) {
            // 최상위 페이지의 타입 변경 시 모든 하위 페이지들도 동일 타입으로 변경
            String newPageType = request.getPageType().trim();
            page.setPageType(newPageType);
            updateChildrenPageType(page, newPageType);
        }

        if (request.getParentId() != null && 
            (page.getParent() == null || !page.getParent().getId().equals(request.getParentId()))) {
            
            if (page.getParent() != null) {
                page.getParent().removeChild(page);
            }

            Optional<WikiPage> newParentOptional = wikiPageRepository.findById(request.getParentId());
            if (newParentOptional.isPresent()) {
                WikiPage newParent = newParentOptional.get();
                // 새 부모의 페이지 타입을 상속받음
                page.setPageType(newParent.getPageType());
                updateChildrenPageType(page, newParent.getPageType());
                newParent.addChild(page);
            } else {
                throw new EntityNotFoundException("Parent page not found");
            }
        }

        // 새로운 히스토리 저장
        Integer nextSeqNbr = getNextSequenceNumber(page.getId());
        savePageHistory(page, nextSeqNbr);

        return convertToDetail(page);
    }

    @Transactional
    public WikiPageDto.Response.Detail updatePageById(Long id, WikiPageDto.Request.Update request, String currentUserStaffId, String currentUserStaffName) {
        Optional<WikiPage> pageOptional = wikiPageRepository.findById(id);
        WikiPage page;
        if (pageOptional.isPresent()) {
            page = pageOptional.get();
        } else {
            throw new EntityNotFoundException("Page not found with id: " + id);
        }

        // 수정자 정보 설정
        page.setModifyStaffId(currentUserStaffId);
        page.setModifyStaffName(currentUserStaffName);

        // 제목 업데이트
        if (request.getTitle() != null && !request.getTitle().trim().isEmpty()) {
            page.setTitle(request.getTitle().trim());
        }
        
        // HTML 특수문자 이스케이프 처리 (< → &lt;, > → &gt; 등)
        // 단, img 태그는 제외
        // 테스트를 위해 임시 주석처리
        // String escapedContent = escapeHtmlExceptImages(request.getContent());
        // log.debug("Content escaping on update - Original length: {}, Escaped length: {}", 
        //         request.getContent().length(), escapedContent.length());
        // page.setContent(escapedContent);
        page.setContent(request.getContent());
        
        // 페이지 타입 업데이트 로직: 최상위 페이지만 직접 타입 변경 가능
        if (page.getParent() == null && request.getPageType() != null && !request.getPageType().trim().isEmpty()) {
            // 최상위 페이지의 타입 변경 시 모든 하위 페이지들도 동일 타입으로 변경
            String newPageType = request.getPageType().trim();
            page.setPageType(newPageType);
            updateChildrenPageType(page, newPageType);
        }

        if (request.getParentId() != null && 
            (page.getParent() == null || !page.getParent().getId().equals(request.getParentId()))) {
            
            if (page.getParent() != null) {
                page.getParent().removeChild(page);
            }

            Optional<WikiPage> newParentOptional = wikiPageRepository.findById(request.getParentId());
            if (newParentOptional.isPresent()) {
                WikiPage newParent = newParentOptional.get();
                // 새 부모의 페이지 타입을 상속받음
                page.setPageType(newParent.getPageType());
                updateChildrenPageType(page, newParent.getPageType());
                newParent.addChild(page);
            } else {
                throw new EntityNotFoundException("Parent page not found");
            }
        }

        // 새로운 히스토리 저장
        Integer nextSeqNbr = getNextSequenceNumber(page.getId());
        savePageHistory(page, nextSeqNbr);

        return convertToDetail(page);
    }

    /**
     * 페이지와 관련된 모든 데이터를 삭제합니다.
     * 연관된 댓글, 파일, 히스토리도 함께 삭제됩니다.
     * 
     * @param title 삭제할 페이지 제목
     * @throws EntityNotFoundException 페이지를 찾을 수 없는 경우
     */
    @Transactional
    public void deletePage(String title) {
        Optional<WikiPage> pageOptional = wikiPageRepository.findByTitle(title);
        WikiPage page;
        if (pageOptional.isPresent()) {
            page = pageOptional.get();
        } else {
            throw new EntityNotFoundException("Page not found: " + title);
        }

        System.out.println("페이지 삭제 시작: " + title);
        
        // 자식 페이지들 먼저 삭제 (재귀적)
        List<WikiPage> children = new ArrayList<>(page.getChildren());
        for (WikiPage child : children) {
            deletePage(child.getTitle()); // 재귀 호출
        }
        
        // 1. 첨부파일들 먼저 처리 (FK 오류 방지)
        List<FileAttachment> attachments = fileAttachmentRepository.findByWikiPageOrderByUploadedAtDesc(page);
        for (FileAttachment attachment : attachments) {
            fileAttachmentRepository.delete(attachment);  // 완전 삭제
            System.out.println("첨부파일 삭제 완료: " + attachment.getOriginalFileName());
        }
        
        // 2. 페이지 히스토리 삭제 (복합키 때문에 수동)
        wikiPageHistoryRepository.deleteByPageId(page.getId());
        System.out.println("페이지 히스토리 삭제 완료: " + page.getId());
        
        // 3. 부모-자식 관계 해제
        if (page.getParent() != null) {
            page.getParent().removeChild(page);
        }

        // 4. 페이지 삭제 (연관 데이터들이 이미 삭제되어 안전함)
        wikiPageRepository.delete(page);
        
        System.out.println("페이지 삭제 완료: " + title);
    }

    /**
     * 페이지와 관련된 모든 데이터를 삭제합니다.
     * 연관된 댓글, 파일, 히스토리도 함께 삭제됩니다.
     * 
     * @param id 삭제할 페이지 ID
     * @throws EntityNotFoundException 페이지를 찾을 수 없는 경우
     */
    @Transactional
    public void deletePageById(Long id) {
        Optional<WikiPage> pageOptional = wikiPageRepository.findById(id);
        WikiPage page;
        if (pageOptional.isPresent()) {
            page = pageOptional.get();
        } else {
            throw new EntityNotFoundException("Page not found with id: " + id);
        }

        System.out.println("페이지 삭제 시작 (ID): " + id);
        
        // 자식 페이지들 먼저 삭제 (재귀적)
        List<WikiPage> children = new ArrayList<>(page.getChildren());
        for (WikiPage child : children) {
            deletePageById(child.getId()); // 재귀 호출
        }
        
        // 1. 첨부파일들 먼저 처리 (FK 오류 방지)
        List<FileAttachment> attachments = fileAttachmentRepository.findByWikiPageOrderByUploadedAtDesc(page);
        for (FileAttachment attachment : attachments) {
            fileAttachmentRepository.delete(attachment);  // 완전 삭제
            System.out.println("첨부파일 삭제 완료: " + attachment.getOriginalFileName());
        }
        
        // 2. 페이지 히스토리 삭제 (복합키 때문에 수동)
        wikiPageHistoryRepository.deleteByPageId(page.getId());
        System.out.println("페이지 히스토리 삭제 완료: " + page.getId());
        
        // 3. 페이지 삭제
        wikiPageRepository.delete(page);
        System.out.println("페이지 삭제 완료 (ID): " + id);
    }

    /**
     * 페이지들의 순서를 변경합니다.
     * 
     * @param orderUpdates 순서 변경 정보 리스트
     */
    @Transactional
    public void updatePagesOrder(List<WikiPageDto.Request.UpdateOrder> orderUpdates) {
        System.out.println("페이지 순서 변경 시작");
        
        for (WikiPageDto.Request.UpdateOrder orderUpdate : orderUpdates) {
            Optional<WikiPage> pageOptional = wikiPageRepository.findById(orderUpdate.getId());
            if (pageOptional.isPresent()) {
                WikiPage page = pageOptional.get();
                page.setDisplayOrder(orderUpdate.getDisplayOrder());
                wikiPageRepository.save(page);
                System.out.println("페이지 순서 변경: " + page.getTitle() + " -> " + orderUpdate.getDisplayOrder());
            }
        }
        
        System.out.println("페이지 순서 변경 완료");
    }

    /**
     * HTML 특수문자를 이스케이프하되, img 태그는 제외하는 메서드
     * @param content 원본 컨텐츠
     * @return 이스케이프된 컨텐츠
     */
    private String escapeHtmlExceptImages(String content) {
        if (content == null) {
            return null;
        }
        
        // img 태그를 임시 플레이스홀더로 치환
        String placeholder = "___IMG_PLACEHOLDER_";
        java.util.List<String> imgTags = new java.util.ArrayList<>();
        java.util.regex.Pattern imgPattern = java.util.regex.Pattern.compile("<img[^>]*>", java.util.regex.Pattern.CASE_INSENSITIVE);
        java.util.regex.Matcher matcher = imgPattern.matcher(content);
        
        StringBuffer sb = new StringBuffer();
        int index = 0;
        while (matcher.find()) {
            String imgTag = matcher.group();
            imgTags.add(imgTag);
            matcher.appendReplacement(sb, placeholder + index + "___");
            index++;
        }
        matcher.appendTail(sb);
        String contentWithPlaceholders = sb.toString();
        
        // HTML 이스케이프 처리
        String escapedContent = HtmlUtils.htmlEscape(contentWithPlaceholders);
        
        // 플레이스홀더를 원래 img 태그로 복원
        for (int i = 0; i < imgTags.size(); i++) {
            String placeholderToReplace = placeholder + i + "___";
            escapedContent = escapedContent.replace(placeholderToReplace, imgTags.get(i));
        }
        
        log.debug("Image tags preserved: {}", imgTags.size());
        
        return escapedContent;
    }
    
    /**
     * 페이지의 부모를 변경합니다.
     * 부모 변경 시 depth와 path도 함께 업데이트됩니다.
     */
    @Transactional
    public void updatePageParent(WikiPageDto.Request.UpdateParent updateParent) {
        System.out.println("페이지 부모 변경 시작: " + updateParent.getPageId() + " -> " + updateParent.getNewParentId());
        
        WikiPage page = wikiPageRepository.findById(updateParent.getPageId())
            .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 페이지입니다: " + updateParent.getPageId()));
        
        WikiPage newParent = null;
        if (updateParent.getNewParentId() != null) {
            newParent = wikiPageRepository.findById(updateParent.getNewParentId())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 부모 페이지입니다: " + updateParent.getNewParentId()));
            
            // 순환 참조 방지: 자신의 자식을 부모로 설정하려는 경우
            if (isDescendant(newParent, page)) {
                throw new IllegalArgumentException("자신의 하위 페이지를 부모로 설정할 수 없습니다.");
            }
        }
        
        // 기존 부모에서 제거
        WikiPage oldParent = page.getParent();
        if (oldParent != null) {
            oldParent.removeChild(page);
        }
        
        // 새 부모에 추가 및 페이지 타입 상속
        if (newParent != null) {
            newParent.addChild(page);
            // 새 부모의 페이지 타입을 상속받음
            page.setPageType(newParent.getPageType());
            updateChildrenPageType(page, newParent.getPageType());
        } else {
            // 최상위로 이동 - 페이지 타입은 기존 타입 유지
            page.setParent(null);
            page.setDepth(0);
            page.setPath("/");
        }
        
        // 순서 설정
        if (updateParent.getDisplayOrder() != null) {
            page.setDisplayOrder(updateParent.getDisplayOrder());
        }
        
        // 하위 페이지들의 depth와 path 재귀적으로 업데이트
        updateDescendantsPaths(page);
        
        wikiPageRepository.save(page);
        System.out.println("페이지 부모 변경 완료: " + page.getTitle());
    }
    
    /**
     * 페이지가 다른 페이지의 하위 페이지인지 확인합니다.
     */
    private boolean isDescendant(WikiPage potentialDescendant, WikiPage ancestor) {
        WikiPage current = potentialDescendant.getParent();
        while (current != null) {
            if (current.getId().equals(ancestor.getId())) {
                return true;
            }
            current = current.getParent();
        }
        return false;
    }
    
    /**
     * 하위 페이지들의 depth와 path를 재귀적으로 업데이트합니다.
     */
    private void updateDescendantsPaths(WikiPage page) {
        if (page.getChildren() != null) {
            for (WikiPage child : page.getChildren()) {
                child.setDepth(page.getDepth() + 1);
                child.setPath(page.getPath() + page.getId() + "/");
                updateDescendantsPaths(child);
                wikiPageRepository.save(child);
            }
        }
    }
    
    /**
     * 하위 페이지들의 페이지 타입을 재귀적으로 업데이트합니다.
     * 
     * @param page 업데이트할 페이지
     * @param pageType 새로운 페이지 타입
     */
    private void updateChildrenPageType(WikiPage page, String pageType) {
        if (page.getChildren() != null) {
            for (WikiPage child : page.getChildren()) {
                child.setPageType(pageType);
                updateChildrenPageType(child, pageType);
                wikiPageRepository.save(child);
            }
        }
    }

    /**
     * 기존 페이지들의 displayOrder를 초기화합니다.
     * 애플리케이션 시작 시 한 번만 실행되는 마이그레이션 로직입니다.
     */
    @Transactional
    public void initializeDisplayOrder() {
        System.out.println("페이지 순서 초기화 시작");
        
        // 최상위 페이지들을 업데이트 시간 순으로 가져와서 순서 설정
        List<WikiPage> rootPages = wikiPageRepository.findByParentIsNullOrderByUpdatedAtDesc();
        for (int i = 0; i < rootPages.size(); i++) {
            WikiPage page = rootPages.get(i);
            if (page.getDisplayOrder() == null || page.getDisplayOrder() == 0) {
                page.setDisplayOrder(i);
                wikiPageRepository.save(page);
                System.out.println("페이지 순서 초기화: " + page.getTitle() + " -> " + i);
            }
        }
        
        // 자식 페이지들도 재귀적으로 초기화
        for (WikiPage rootPage : rootPages) {
            initializeChildrenDisplayOrder(rootPage);
        }
        
        System.out.println("페이지 순서 초기화 완료");
    }
    
    /**
     * 자식 페이지들의 displayOrder를 재귀적으로 초기화합니다.
     */
    private void initializeChildrenDisplayOrder(WikiPage parent) {
        List<WikiPage> children = parent.getChildren();
        if (children != null && !children.isEmpty()) {
            // 업데이트 시간 순으로 정렬
            children.sort((p1, p2) -> p2.getUpdatedAt().compareTo(p1.getUpdatedAt()));
            
            for (int i = 0; i < children.size(); i++) {
                WikiPage child = children.get(i);
                if (child.getDisplayOrder() == null || child.getDisplayOrder() == 0) {
                    child.setDisplayOrder(i);
                    wikiPageRepository.save(child);
                    System.out.println("자식 페이지 순서 초기화: " + child.getTitle() + " -> " + i);
                }
                
                // 재귀적으로 자식의 자식들도 처리
                initializeChildrenDisplayOrder(child);
            }
        }
    }

    public List<WikiPageDto.Response.Summary> searchPages(String query) {
        List<WikiPage> pages = wikiPageRepository.findByTitleContainingIgnoreCase(query);
        List<WikiPageDto.Response.Summary> result = new ArrayList<>();
        for (WikiPage page : pages) {
            result.add(convertToSummary(page));
        }
        return result;
    }
    
    /**
     * PAGE_TYPE별 페이지 목록을 조회합니다.
     */
    public List<WikiPageDto.Response.Summary> getPagesByType(String pageType) {
        System.out.println("페이지 타입별 조회 - pageType: " + pageType);
        
        List<WikiPage> pages = wikiPageRepository.findByPageTypeAndParentIsNullOrderByDisplayOrderAsc(pageType);
        
        List<WikiPageDto.Response.Summary> result = new ArrayList<>();
        for (WikiPage page : pages) {
            loadChildrenRecursively(page);
            result.add(convertToSummary(page));
        }
        
        System.out.println("페이지 타입별 조회 결과: " + result.size() + "개");
        return result;
    }
    
    /**
     * 제목과 내용에서 통합 검색합니다.
     * 
     * @param query 검색 키워드
     * @return 검색 결과 페이지 목록
     */
    public List<WikiPageDto.Response.SearchResult> searchPagesInTitleAndContent(String query) {
        System.out.println("통합 검색 요청 - query: " + query);
        List<WikiPage> pages = wikiPageRepository.findByTitleContainingIgnoreCaseOrContentContainingIgnoreCase(query, query);
        
        List<WikiPageDto.Response.SearchResult> result = new ArrayList<>();
        for (WikiPage page : pages) {
            result.add(convertToSearchResult(page, query));
        }
        
        System.out.println("검색 결과: " + result.size() + "개");
        return result;
    }
    
    /**
     * 검색 결과 DTO로 변환합니다.
     */
    private WikiPageDto.Response.SearchResult convertToSearchResult(WikiPage page, String query) {
        WikiPageDto.Response.SearchResult searchResult = new WikiPageDto.Response.SearchResult();
        searchResult.setId(page.getId());
        searchResult.setTitle(page.getTitle());
        searchResult.setUpdatedAt(page.getUpdatedAt());
        
        // 내용에서 검색어 주변의 스니펫 생성 (최대 200자)
        String snippet = generateSnippet(page.getContent(), query, 200);
        searchResult.setSnippet(snippet);
        
        // 제목에 검색어가 포함되어 있는지 확인
        boolean titleMatch = page.getTitle().toLowerCase().contains(query.toLowerCase());
        searchResult.setTitleMatch(titleMatch);
        
        return searchResult;
    }
    
    /**
     * 검색어 주변의 텍스트 스니펫을 생성합니다.
     */
    private String generateSnippet(String content, String query, int maxLength) {
        if (content == null || content.isEmpty()) {
            return "";
        }
        
        String lowerContent = content.toLowerCase();
        String lowerQuery = query.toLowerCase();
        
        int queryIndex = lowerContent.indexOf(lowerQuery);
        
        if (queryIndex == -1) {
            // 검색어가 내용에 없으면 앞에서부터 자르기
            return content.length() > maxLength ? content.substring(0, maxLength) + "..." : content;
        }
        
        // 검색어 주변의 텍스트 추출
        int start = Math.max(0, queryIndex - maxLength / 2);
        int end = Math.min(content.length(), start + maxLength);
        
        // 단어 경계에서 자르기 위해 조정
        if (start > 0) {
            int spaceIndex = content.indexOf(' ', start);
            if (spaceIndex != -1 && spaceIndex < queryIndex) {
                start = spaceIndex + 1;
            }
        }
        
        if (end < content.length()) {
            int spaceIndex = content.lastIndexOf(' ', end);
            if (spaceIndex != -1 && spaceIndex > queryIndex + query.length()) {
                end = spaceIndex;
            }
        }
        
        String snippet = content.substring(start, end);
        
        if (start > 0) {
            snippet = "..." + snippet;
        }
        if (end < content.length()) {
            snippet = snippet + "...";
        }
        
        return snippet;
    }

    // 페이지 히스토리 저장
    private void savePageHistory(WikiPage page, Integer seqNbr) {
        WikiPageHistory history = new WikiPageHistory(page, seqNbr);
        wikiPageHistoryRepository.save(history);
    }

    // 다음 시퀀스 번호 가져오기
    private Integer getNextSequenceNumber(Long pageId) {
        Optional<Integer> maxSeqOptional = wikiPageHistoryRepository.findMaxSeqNbrById(pageId);
        if (maxSeqOptional.isPresent()) {
            return maxSeqOptional.get() + 1;
        } else {
            return 1;
        }
    }

    // 재귀적으로 모든 자식 페이지를 로딩하는 헬퍼 메서드
    private void loadChildrenRecursively(WikiPage page) {
        // 자식 컬렉션에 접근하여 지연 로딩 트리거
        page.getChildren().size(); 
        
        // 모든 자식에 대해 재귀적으로 로딩
        for (WikiPage child : page.getChildren()) {
            loadChildrenRecursively(child);
        }
    }

    private WikiPageDto.Response.Summary convertToSummary(WikiPage page) {
        WikiPageDto.Response.Summary summary = new WikiPageDto.Response.Summary();
        summary.setId(page.getId());
        summary.setTitle(page.getTitle());
        summary.setParentId(page.getParent() != null ? page.getParent().getId() : null);
        summary.setDepth(page.getDepth());
        summary.setPath(page.getPath());
        summary.setDisplayOrder(page.getDisplayOrder());
        summary.setPageType(page.getPageType());
        summary.setUpdatedAt(page.getUpdatedAt());
        summary.setFileCount((int) fileAttachmentRepository.countByWikiPage(page));
        summary.setCreationStaffId(page.getCreationStaffId());
        summary.setCreationStaffName(page.getCreationStaffName());
        List<WikiPageDto.Response.Summary> children = new ArrayList<>();
        // 자식 페이지들을 displayOrder로 정렬
        List<WikiPage> sortedChildren = page.getChildren().stream()
                .sorted((p1, p2) -> {
                    int orderCompare = Integer.compare(p1.getDisplayOrder(), p2.getDisplayOrder());
                    return orderCompare != 0 ? orderCompare : p1.getUpdatedAt().compareTo(p2.getUpdatedAt());
                })
                .collect(java.util.stream.Collectors.toList());
        for (WikiPage child : sortedChildren) {
            children.add(convertToSummary(child));
        }
        summary.setChildren(children);
        return summary;
    }

    private WikiPageDto.Response.Detail convertToDetail(WikiPage page) {
        // 히스토리 없이 호출되는 경우 (createPage, updatePage)
        return convertToDetail(page, new ArrayList<>());
    }

    private WikiPageDto.Response.Detail convertToDetail(WikiPage page, List<WikiPageHistory> historyList) {
        WikiPageDto.Response.Detail detail = new WikiPageDto.Response.Detail();
        detail.setId(page.getId());
        detail.setTitle(page.getTitle());
        detail.setContent(page.getContent());
        detail.setParentId(page.getParent() != null ? page.getParent().getId() : null);
        detail.setDepth(page.getDepth());
        detail.setPath(page.getPath());
        detail.setDisplayOrder(page.getDisplayOrder());
        detail.setPageType(page.getPageType());
        detail.setCreatedAt(page.getCreatedAt());
        detail.setUpdatedAt(page.getUpdatedAt());
        detail.setCreationStaffId(page.getCreationStaffId());
        detail.setCreationStaffName(page.getCreationStaffName());
        detail.setModifyStaffId(page.getModifyStaffId());
        detail.setModifyStaffName(page.getModifyStaffName());
        
        List<WikiPageDto.Response.Summary> children = new ArrayList<>();
        // 자식 페이지들을 displayOrder로 정렬
        List<WikiPage> sortedChildren = page.getChildren().stream()
                .sorted((p1, p2) -> {
                    int orderCompare = Integer.compare(p1.getDisplayOrder(), p2.getDisplayOrder());
                    return orderCompare != 0 ? orderCompare : p1.getUpdatedAt().compareTo(p2.getUpdatedAt());
                })
                .collect(java.util.stream.Collectors.toList());
                
        for (WikiPage child : sortedChildren) {
            children.add(convertToSummary(child));
        }
        detail.setChildren(children);
        
        if (page.getParent() != null) {
            detail.setParent(convertToSummary(page.getParent()));
        }
        
        // 히스토리 정보 추가
        List<WikiPageDto.Response.History> history = new ArrayList<>();
        for (WikiPageHistory historyItem : historyList) {
            WikiPageDto.Response.History historyDto = new WikiPageDto.Response.History();
            historyDto.setId(historyItem.getId());
            historyDto.setSeqNbr(historyItem.getSeqNbr());
            historyDto.setTitle(historyItem.getTitle());
            historyDto.setContent(historyItem.getContent());
            historyDto.setCreatedAt(historyItem.getCreatedAt());
            historyDto.setUpdatedAt(historyItem.getUpdatedAt());
            history.add(historyDto);
        }
        detail.setHistory(history);
        
        return detail;
    }

    /**
     * 특정 히스토리 버전으로 페이지를 복원합니다.
     * 
     * @param id 페이지 ID
     * @param seqNbr 복원할 히스토리 시퀀스 번호
     * @param currentUserStaffId 현재 사용자 ID
     * @return 복원된 페이지 정보
     * @throws EntityNotFoundException 페이지나 히스토리를 찾을 수 없는 경우
     */
    @Transactional
    public WikiPageDto.Response.Detail restoreHistory(Long id, Integer seqNbr, String currentUserStaffId) {
        Optional<WikiPage> pageOptional = wikiPageRepository.findById(id);
        if (!pageOptional.isPresent()) {
            throw new EntityNotFoundException("Page not found with id: " + id);
        }
        
        WikiPage page = pageOptional.get();
        
        // 히스토리 조회
        Optional<WikiPageHistory> historyOptional = wikiPageHistoryRepository.findByIdAndSeqNbr(id, seqNbr);
        if (!historyOptional.isPresent()) {
            throw new EntityNotFoundException("History not found for page " + id + " with seqNbr " + seqNbr);
        }
        
        WikiPageHistory history = historyOptional.get();
        
        // 수정자 정보 설정
        page.setModifyStaffId(currentUserStaffId);
        
        // 히스토리 내용으로 복원
        page.setTitle(history.getTitle());
        page.setContent(history.getContent());
        
        // 새로운 히스토리 저장 (복원 작업 기록)
        Integer nextSeqNbr = getNextSequenceNumber(page.getId());
        savePageHistory(page, nextSeqNbr);
        
        return convertToDetail(page);
    }
    
    /**
     * 기존 데이터의 누락된 staff name 채우기
     * creation_staff_id는 있지만 creation_staff_name이 없는 경우 업데이트
     */
    @Transactional
    public void fillMissingStaffNames() {
        List<WikiPage> allPages = wikiPageRepository.findAll();
        int updatedCount = 0;
        
        for (WikiPage page : allPages) {
            boolean needsUpdate = false;
            
            // creation_staff_name이 null이지만 creation_staff_id가 있는 경우
            if (page.getCreationStaffName() == null && page.getCreationStaffId() != null) {
                // 기본값으로 staffId를 사용
                page.setCreationStaffName(page.getCreationStaffId());
                needsUpdate = true;
                log.info("페이지 {} - creation_staff_name 업데이트: {}", page.getId(), page.getCreationStaffId());
            }
            
            // modify_staff_name이 null이지만 modify_staff_id가 있는 경우
            if (page.getModifyStaffName() == null && page.getModifyStaffId() != null) {
                // 기본값으로 staffId를 사용
                page.setModifyStaffName(page.getModifyStaffId());
                needsUpdate = true;
                log.info("페이지 {} - modify_staff_name 업데이트: {}", page.getId(), page.getModifyStaffId());
            }
            
            if (needsUpdate) {
                wikiPageRepository.save(page);
                updatedCount++;
            }
        }
        
        log.info("총 {} 개의 페이지에서 누락된 staff name을 업데이트했습니다.", updatedCount);
    }
    
    /**
     * 페이지 컨텐츠만 업데이트 (Y.js 자동 저장용)
     * 
     * @param pageId 페이지 ID
     * @param content 새로운 컨텐츠
     * @return 업데이트 성공 여부
     */
    @Transactional
    public boolean updateContent(Long pageId, String content) {
        try {
            Optional<WikiPage> pageOptional = wikiPageRepository.findById(pageId);
            if (pageOptional.isPresent()) {
                WikiPage page = pageOptional.get();
                page.setContent(content);
                // Y.js 자동 저장은 수정자 정보를 변경하지 않음
                // 기존의 creation_staff_name과 modify_staff_name을 유지
                // page.setModifyStaffId("SYSTEM"); // 제거 - 기존 수정자 정보 유지
                wikiPageRepository.save(page);
                log.info("페이지 컨텐츠 자동 저장 완료 - pageId: {}", pageId);
                return true;
            } else {
                log.warn("페이지를 찾을 수 없음 - pageId: {}", pageId);
                return false;
            }
        } catch (Exception e) {
            log.error("페이지 컨텐츠 저장 실패 - pageId: {}, 오류: {}", pageId, e.getMessage());
            return false;
        }
    }
} 