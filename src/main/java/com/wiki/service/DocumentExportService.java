package com.wiki.service;

import com.wiki.entity.WikiPage;
import com.wiki.repository.WikiPageRepository;
import com.wiki.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFRun;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFRow;
import org.apache.poi.xssf.usermodel.XSSFCell;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.format.DateTimeFormatter;

/**
 * 문서 내보내기 서비스
 * SOLID 원칙을 준수하여 문서 변환 기능만을 담당합니다.
 * 단일 책임 원칙: Word/Excel 문서 생성 및 변환만 담당
 * 개방-폐쇄 원칙: 새로운 문서 형식 추가 시 기존 코드 수정 없이 확장 가능
 */
@Service
@RequiredArgsConstructor
public class DocumentExportService {
    
    private final WikiPageRepository wikiPageRepository;
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    
    /**
     * Wiki 페이지를 Word 문서로 변환합니다.
     * 
     * @param pageId 페이지 ID
     * @return Word 문서의 바이트 배열
     * @throws IOException 파일 생성 실패 시
     * @throws ResourceNotFoundException 페이지를 찾을 수 없을 때
     */
    public byte[] exportToWord(Long pageId) throws IOException {
        WikiPage page = wikiPageRepository.findById(pageId)
                .orElseThrow(() -> new ResourceNotFoundException("페이지를 찾을 수 없습니다: " + pageId));
        
        try (XWPFDocument document = new XWPFDocument();
             ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            
            // 제목 추가
            XWPFParagraph titleParagraph = document.createParagraph();
            XWPFRun titleRun = titleParagraph.createRun();
            titleRun.setText(page.getTitle());
            titleRun.setBold(true);
            titleRun.setFontSize(18);
            
            // 메타 정보 추가
            XWPFParagraph metaParagraph = document.createParagraph();
            XWPFRun metaRun = metaParagraph.createRun();
            metaRun.setText("작성자: " + (page.getCreationStaffId() != null ? page.getCreationStaffId() : "알 수 없음"));
            metaRun.addBreak();
            metaRun.setText("작성일: " + (page.getCreatedAt() != null ? page.getCreatedAt().format(DATE_FORMATTER) : "알 수 없음"));
            metaRun.addBreak();
            metaRun.setText("수정자: " + (page.getModifyStaffId() != null ? page.getModifyStaffId() : "알 수 없음"));
            metaRun.addBreak();
            metaRun.setText("수정일: " + (page.getUpdatedAt() != null ? page.getUpdatedAt().format(DATE_FORMATTER) : "알 수 없음"));
            metaRun.setFontSize(10);
            
            // 구분선 추가
            XWPFParagraph separatorParagraph = document.createParagraph();
            XWPFRun separatorRun = separatorParagraph.createRun();
            separatorRun.setText("─".repeat(50));
            
            // 내용 추가
            XWPFParagraph contentParagraph = document.createParagraph();
            XWPFRun contentRun = contentParagraph.createRun();
            
            // Markdown 형식의 내용을 일반 텍스트로 변환 (간단한 변환)
            String plainContent = convertMarkdownToPlainText(page.getContent() != null ? page.getContent() : "");
            contentRun.setText(plainContent);
            contentRun.setFontSize(12);
            
            document.write(outputStream);
            return outputStream.toByteArray();
        }
    }
    
    /**
     * Wiki 페이지를 Excel 문서로 변환합니다.
     * 
     * @param pageId 페이지 ID
     * @return Excel 문서의 바이트 배열
     * @throws IOException 파일 생성 실패 시
     * @throws ResourceNotFoundException 페이지를 찾을 수 없을 때
     */
    public byte[] exportToExcel(Long pageId) throws IOException {
        WikiPage page = wikiPageRepository.findById(pageId)
                .orElseThrow(() -> new ResourceNotFoundException("페이지를 찾을 수 없습니다: " + pageId));
        
        try (XSSFWorkbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            
            XSSFSheet sheet = workbook.createSheet("Wiki Page");
            
            int rowNum = 0;
            
            // 헤더 정보
            createRow(sheet, rowNum++, "항목", "내용");
            createRow(sheet, rowNum++, "제목", page.getTitle());
            createRow(sheet, rowNum++, "작성자", page.getCreationStaffId() != null ? page.getCreationStaffId() : "알 수 없음");
            createRow(sheet, rowNum++, "작성일", page.getCreatedAt() != null ? page.getCreatedAt().format(DATE_FORMATTER) : "알 수 없음");
            createRow(sheet, rowNum++, "수정자", page.getModifyStaffId() != null ? page.getModifyStaffId() : "알 수 없음");
            createRow(sheet, rowNum++, "수정일", page.getUpdatedAt() != null ? page.getUpdatedAt().format(DATE_FORMATTER) : "알 수 없음");
            createRow(sheet, rowNum++, "페이지 타입", page.getPageType());
            
            // 빈 행 추가
            rowNum++;
            
            // 내용 추가
            createRow(sheet, rowNum++, "내용", "");
            
            // 내용을 여러 행으로 분할
            String content = page.getContent() != null ? page.getContent() : "";
            String plainContent = convertMarkdownToPlainText(content);
            String[] lines = plainContent.split("\n");
            
            for (String line : lines) {
                if (line.trim().isEmpty()) {
                    rowNum++; // 빈 행
                } else {
                    createRow(sheet, rowNum++, "", line);
                }
            }
            
            // 열 너비 자동 조정
            sheet.autoSizeColumn(0);
            sheet.autoSizeColumn(1);
            
            workbook.write(outputStream);
            return outputStream.toByteArray();
        }
    }
    
    /**
     * Excel 시트에 행을 생성합니다.
     */
    private void createRow(XSSFSheet sheet, int rowNum, String col1, String col2) {
        XSSFRow row = sheet.createRow(rowNum);
        XSSFCell cell1 = row.createCell(0);
        XSSFCell cell2 = row.createCell(1);
        
        cell1.setCellValue(col1);
        cell2.setCellValue(col2);
    }
    
    /**
     * Markdown 형식의 텍스트를 일반 텍스트로 변환합니다.
     * 간단한 변환만 수행합니다.
     */
    private String convertMarkdownToPlainText(String markdown) {
        if (markdown == null || markdown.isEmpty()) {
            return "";
        }
        
        return markdown
                // 헤더 제거 (# ## ### 등)
                .replaceAll("^#{1,6}\\s+", "")
                // 볼드 제거 (**text** -> text)
                .replaceAll("\\*\\*(.*?)\\*\\*", "$1")
                // 이탤릭 제거 (*text* -> text)
                .replaceAll("\\*(.*?)\\*", "$1")
                // 링크 제거 ([text](url) -> text)
                .replaceAll("\\[([^\\]]+)\\]\\([^\\)]+\\)", "$1")
                // 코드 블록 제거 (`code` -> code)
                .replaceAll("`([^`]+)`", "$1")
                // 리스트 마커 제거 (- * + 등)
                .replaceAll("^[\\s]*[-\\*\\+]\\s+", "")
                // 인용문 제거 (> text -> text)
                .replaceAll("^>\\s+", "")
                // HTML 태그 제거
                .replaceAll("<[^>]+>", "")
                // 여러 개의 연속된 공백을 하나로
                .replaceAll("\\s+", " ")
                .trim();
    }
} 