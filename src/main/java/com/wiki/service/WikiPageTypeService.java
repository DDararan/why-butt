package com.wiki.service;

import com.wiki.dto.WikiPageTypeDto;
import com.wiki.entity.WikiPageType;
import com.wiki.repository.WikiPageTypeRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WikiPageTypeService {
    private final WikiPageTypeRepository wikiPageTypeRepository;

    public List<WikiPageTypeDto.Response.Detail> getAllPageTypes() {
        List<WikiPageType> pageTypes = wikiPageTypeRepository.findAllByOrderByCreatedAtAsc();
        return pageTypes.stream()
                .map(this::convertToDetail)
                .collect(Collectors.toList());
    }

    public WikiPageTypeDto.Response.Detail getPageType(String pageType) {
        Optional<WikiPageType> pageTypeOptional = wikiPageTypeRepository.findById(pageType);
        if (pageTypeOptional.isPresent()) {
            return convertToDetail(pageTypeOptional.get());
        } else {
            throw new EntityNotFoundException("Page type not found: " + pageType);
        }
    }

    @Transactional
    public WikiPageTypeDto.Response.Detail createPageType(WikiPageTypeDto.Request.Create request, String currentUserStaffId) {
        // 중복 체크
        if (wikiPageTypeRepository.existsByPageType(request.getPageType())) {
            throw new IllegalArgumentException("Page type already exists: " + request.getPageType());
        }

        WikiPageType pageType = new WikiPageType();
        pageType.setPageType(request.getPageType());
        pageType.setPageTitle(request.getPageTitle());
        pageType.setCreationStaffId(currentUserStaffId);
        pageType.setModifyStaffId(currentUserStaffId);

        WikiPageType savedPageType = wikiPageTypeRepository.save(pageType);
        return convertToDetail(savedPageType);
    }

    @Transactional
    public WikiPageTypeDto.Response.Detail updatePageType(String pageType, WikiPageTypeDto.Request.Update request, String currentUserStaffId) {
        Optional<WikiPageType> pageTypeOptional = wikiPageTypeRepository.findById(pageType);
        if (pageTypeOptional.isPresent()) {
            WikiPageType existingPageType = pageTypeOptional.get();
            existingPageType.setPageTitle(request.getPageTitle());
            existingPageType.setModifyStaffId(currentUserStaffId);
            
            WikiPageType savedPageType = wikiPageTypeRepository.save(existingPageType);
            return convertToDetail(savedPageType);
        } else {
            throw new EntityNotFoundException("Page type not found: " + pageType);
        }
    }

    @Transactional
    public void deletePageType(String pageType) {
        if (!wikiPageTypeRepository.existsByPageType(pageType)) {
            throw new EntityNotFoundException("Page type not found: " + pageType);
        }
        wikiPageTypeRepository.deleteById(pageType);
    }

    private WikiPageTypeDto.Response.Detail convertToDetail(WikiPageType pageType) {
        WikiPageTypeDto.Response.Detail detail = new WikiPageTypeDto.Response.Detail();
        detail.setPageType(pageType.getPageType());
        detail.setPageTitle(pageType.getPageTitle());
        detail.setCreationStaffId(pageType.getCreationStaffId());
        detail.setModifyStaffId(pageType.getModifyStaffId());
        detail.setCreatedAt(pageType.getCreatedAt());
        detail.setUpdatedAt(pageType.getUpdatedAt());
        return detail;
    }
} 