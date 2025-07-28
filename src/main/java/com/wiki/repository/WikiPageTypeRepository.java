package com.wiki.repository;

import com.wiki.entity.WikiPageType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WikiPageTypeRepository extends JpaRepository<WikiPageType, String> {
    List<WikiPageType> findAllByOrderByCreatedAtAsc();
    boolean existsByPageType(String pageType);
} 