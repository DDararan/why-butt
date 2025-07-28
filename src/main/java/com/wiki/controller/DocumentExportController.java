package com.wiki.controller;

import com.wiki.service.DocumentExportService;
import com.wiki.entity.WikiPage;
import com.wiki.repository.WikiPageRepository;
import com.wiki.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

/**
 * 문서 다운로드 컨트롤러
 * Wiki 페이지를 다양한 형식으로 다운로드하는 API를 제공합니다.
 */
@RestController
@RequestMapping("/api/export")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3002"})
public class DocumentExportController {
    
    private final DocumentExportService documentExportService;
    private final WikiPageRepository wikiPageRepository;
    
    /**
     * Wiki 페이지를 Word 문서로 다운로드
     */
    @GetMapping("/word/{pageId}")
    public ResponseEntity<ByteArrayResource> exportToWord(@PathVariable Long pageId) {
        try {
            System.out.println("Word 다운로드 요청 - pageId: " + pageId);
            
            WikiPage page = wikiPageRepository.findById(pageId)
                    .orElseThrow(() -> new ResourceNotFoundException("페이지를 찾을 수 없습니다: " + pageId));
            
            byte[] docxData = documentExportService.exportToWord(pageId);
            ByteArrayResource resource = new ByteArrayResource(docxData);
            
            String fileName = sanitizeFileName(page.getTitle()) + ".docx";
            String encodedFileName = URLEncoder.encode(fileName, StandardCharsets.UTF_8).replace("+", "%20");
            
            System.out.println("Word 파일 생성 완료 - 파일명: " + fileName + ", 크기: " + docxData.length + " bytes");
            
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.wordprocessingml.document"))
                    .header(HttpHeaders.CONTENT_DISPOSITION, 
                            "attachment; filename=\"" + fileName + "\"; filename*=UTF-8''" + encodedFileName)
                    .contentLength(docxData.length)
                    .body(resource);
                    
        } catch (IOException e) {
            System.err.println("Word 문서 생성 중 오류: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Word 문서 생성 중 오류가 발생했습니다.", e);
        } catch (Exception e) {
            System.err.println("예상치 못한 오류: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("파일 다운로드 중 오류가 발생했습니다.", e);
        }
    }
    
    /**
     * Wiki 페이지를 Excel 파일로 다운로드
     */
    @GetMapping("/excel/{pageId}")
    public ResponseEntity<ByteArrayResource> exportToExcel(@PathVariable Long pageId) {
        try {
            System.out.println("Excel 다운로드 요청 - pageId: " + pageId);
            
            WikiPage page = wikiPageRepository.findById(pageId)
                    .orElseThrow(() -> new ResourceNotFoundException("페이지를 찾을 수 없습니다: " + pageId));
            
            byte[] excelData = documentExportService.exportToExcel(pageId);
            ByteArrayResource resource = new ByteArrayResource(excelData);
            
            String fileName = sanitizeFileName(page.getTitle()) + ".xlsx";
            String encodedFileName = URLEncoder.encode(fileName, StandardCharsets.UTF_8).replace("+", "%20");
            
            System.out.println("Excel 파일 생성 완료 - 파일명: " + fileName + ", 크기: " + excelData.length + " bytes");
            
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                    .header(HttpHeaders.CONTENT_DISPOSITION, 
                            "attachment; filename=\"" + fileName + "\"; filename*=UTF-8''" + encodedFileName)
                    .contentLength(excelData.length)
                    .body(resource);
                    
        } catch (IOException e) {
            System.err.println("Excel 파일 생성 중 오류: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Excel 파일 생성 중 오류가 발생했습니다.", e);
        } catch (Exception e) {
            System.err.println("예상치 못한 오류: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("파일 다운로드 중 오류가 발생했습니다.", e);
        }
    }
    
    /**
     * 파일명에서 특수문자 제거
     */
    private String sanitizeFileName(String fileName) {
        if (fileName == null) {
            return "wiki_page";
        }
        
        // 파일명에 사용할 수 없는 문자들을 제거하거나 대체
        return fileName.replaceAll("[\\\\/:*?\"<>|]", "_")
                      .replaceAll("\\s+", "_")
                      .trim();
    }
} 