package com.wiki.service;

import com.wiki.entity.WikiPage;
import com.wiki.repository.WikiPageRepository;
import com.wiki.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFRun;
import org.apache.poi.xssf.usermodel.*;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.springframework.stereotype.Service;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Base64;
import org.apache.poi.util.IOUtils;

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
     * HTML 내용을 파싱하여 표를 포함한 내용을 Excel로 변환합니다.
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
            
            XSSFSheet sheet = workbook.createSheet(page.getTitle());
            
            // 스타일 생성
            CellStyle headerStyle = createHeaderStyle(workbook);
            CellStyle infoStyle = createInfoStyle(workbook);
            CellStyle tableCellStyle = createTableCellStyle(workbook);
            CellStyle tableHeaderStyle = createTableHeaderStyle(workbook);
            
            int rowNum = 0;
            
            // HTML 내용 파싱 - 메타 정보 없이 내용만 포함
            String content = page.getContent() != null ? page.getContent() : "";
            Document doc = Jsoup.parse(content);
            
            // HTML 요소를 Excel로 변환
            rowNum = parseHtmlToExcel(doc.body(), sheet, rowNum, tableCellStyle, tableHeaderStyle);
            
            // 열 너비 자동 조정
            for (int i = 0; i < 10; i++) {
                try {
                    sheet.autoSizeColumn(i);
                    // 최대 너비 제한
                    if (sheet.getColumnWidth(i) > 15000) {
                        sheet.setColumnWidth(i, 15000);
                    }
                } catch (Exception e) {
                    // 열이 없을 수 있음
                }
            }
            
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
     * 정보 행을 생성합니다.
     */
    private void createInfoRow(XSSFSheet sheet, int rowNum, String label, String value, CellStyle style) {
        XSSFRow row = sheet.createRow(rowNum);
        XSSFCell labelCell = row.createCell(0);
        XSSFCell valueCell = row.createCell(1);
        
        labelCell.setCellValue(label);
        labelCell.setCellStyle(style);
        valueCell.setCellValue(value);
        
        sheet.addMergedRegion(new CellRangeAddress(rowNum, rowNum, 1, 3));
    }
    
    /**
     * 헤더 스타일을 생성합니다.
     */
    private CellStyle createHeaderStyle(XSSFWorkbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setBold(true);
        font.setFontHeightInPoints((short) 16);
        style.setFont(font);
        style.setAlignment(HorizontalAlignment.CENTER);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        return style;
    }
    
    /**
     * 정보 스타일을 생성합니다.
     */
    private CellStyle createInfoStyle(XSSFWorkbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setBold(true);
        style.setFont(font);
        style.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
        return style;
    }
    
    /**
     * 표 셀 스타일을 생성합니다.
     */
    private CellStyle createTableCellStyle(XSSFWorkbook workbook) {
        CellStyle style = workbook.createCellStyle();
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
        style.setVerticalAlignment(VerticalAlignment.TOP);
        style.setWrapText(true);
        return style;
    }
    
    /**
     * 표 헤더 스타일을 생성합니다.
     */
    private CellStyle createTableHeaderStyle(XSSFWorkbook workbook) {
        CellStyle style = createTableCellStyle(workbook);
        Font font = workbook.createFont();
        font.setBold(true);
        style.setFont(font);
        style.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setAlignment(HorizontalAlignment.CENTER);
        return style;
    }
    
    /**
     * HTML을 Excel로 파싱합니다.
     * TipTap 에디터의 구조를 정확히 처리합니다.
     */
    private int parseHtmlToExcel(Element element, XSSFSheet sheet, int startRow, 
                                 CellStyle tableCellStyle, CellStyle tableHeaderStyle) {
        int currentRow = startRow;
        
        // TipTap은 주로 p 태그로 내용을 감싸므로 순차적으로 처리
        for (Element child : element.children()) {
            currentRow = parseElement(child, sheet, currentRow, tableCellStyle, tableHeaderStyle, 0);
        }
        
        // 텍스트 노드 처리
        String text = element.ownText().trim();
        if (!text.isEmpty()) {
            XSSFRow row = sheet.createRow(currentRow++);
            XSSFCell cell = row.createCell(0);
            cell.setCellValue(text);
            sheet.addMergedRegion(new CellRangeAddress(currentRow-1, currentRow-1, 0, 5));
        }
        
        return currentRow;
    }
    
    /**
     * 개별 HTML 요소를 Excel로 변환합니다.
     */
    private int parseElement(Element element, XSSFSheet sheet, int startRow, 
                            CellStyle tableCellStyle, CellStyle tableHeaderStyle, int indent) {
        int currentRow = startRow;
        String tagName = element.tagName();
        
        switch (tagName) {
            case "table":
                // 표 처리
                currentRow = parseTableToExcel(element, sheet, currentRow, tableCellStyle, tableHeaderStyle);
                currentRow++; // 표 후 빈 행
                break;
                
            case "p":
            case "div":
                // 단락 처리 - 내부 요소들을 확인
                if (element.children().isEmpty() && !element.html().contains("<")) {
                    // 텍스트만 있는 경우
                    String text = element.text().trim();
                    if (!text.isEmpty() || element.html().contains("<br>")) {
                        XSSFRow row = sheet.createRow(currentRow++);
                        XSSFCell cell = row.createCell(indent);
                        cell.setCellValue(text);
                        if (indent == 0) {
                            sheet.addMergedRegion(new CellRangeAddress(currentRow-1, currentRow-1, 0, 5));
                        }
                    }
                } else {
                    // 내부에 서식이 있는 경우 RichText로 처리
                    XSSFRichTextString richText = parseRichText(element, sheet.getWorkbook());
                    if (richText != null && richText.getString() != null && richText.length() > 0) {
                        XSSFRow row = sheet.createRow(currentRow++);
                        XSSFCell cell = row.createCell(indent);
                        cell.setCellValue(richText);
                        if (indent == 0) {
                            sheet.addMergedRegion(new CellRangeAddress(currentRow-1, currentRow-1, 0, 5));
                        }
                    } else {
                        // RichText 처리 실패 시 일반 텍스트로 처리
                        String text = element.text().trim();
                        if (!text.isEmpty()) {
                            XSSFRow row = sheet.createRow(currentRow++);
                            XSSFCell cell = row.createCell(indent);
                            cell.setCellValue(text);
                            if (indent == 0) {
                                sheet.addMergedRegion(new CellRangeAddress(currentRow-1, currentRow-1, 0, 5));
                            }
                        }
                    }
                }
                break;
                
            case "h1":
            case "h2":
            case "h3":
            case "h4":
            case "h5":
            case "h6":
                // 제목 처리
                String headingText = element.text().trim();
                if (!headingText.isEmpty()) {
                    XSSFRow row = sheet.createRow(currentRow++);
                    XSSFCell cell = row.createCell(0);
                    cell.setCellValue(headingText);
                    
                    CellStyle headingStyle = sheet.getWorkbook().createCellStyle();
                    Font font = sheet.getWorkbook().createFont();
                    font.setBold(true);
                    int level = Integer.parseInt(tagName.substring(1));
                    font.setFontHeightInPoints((short) (20 - level * 2));
                    headingStyle.setFont(font);
                    cell.setCellStyle(headingStyle);
                    
                    sheet.addMergedRegion(new CellRangeAddress(currentRow-1, currentRow-1, 0, 5));
                }
                break;
                
            case "ul":
            case "ol":
                // 리스트 처리
                currentRow = parseListToExcel(element, sheet, currentRow, tagName.equals("ol"));
                break;
                
            case "li":
                // 리스트 아이템 (중첩 리스트에서 직접 호출되는 경우)
                String liText = element.text().trim();
                if (!liText.isEmpty()) {
                    XSSFRow row = sheet.createRow(currentRow++);
                    XSSFCell cell = row.createCell(indent);
                    cell.setCellValue("• " + liText);
                }
                break;
                
            case "blockquote":
                // 인용문 처리
                for (Element child : element.children()) {
                    currentRow = parseElement(child, sheet, currentRow, tableCellStyle, tableHeaderStyle, indent + 1);
                }
                break;
                
            case "pre":
            case "code":
                // 코드 블록 처리
                String codeText = element.text();
                if (!codeText.isEmpty()) {
                    XSSFRow row = sheet.createRow(currentRow++);
                    XSSFCell cell = row.createCell(indent);
                    cell.setCellValue(codeText);
                    
                    CellStyle codeStyle = sheet.getWorkbook().createCellStyle();
                    Font font = sheet.getWorkbook().createFont();
                    font.setFontName("Courier New");
                    codeStyle.setFont(font);
                    codeStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
                    codeStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
                    cell.setCellStyle(codeStyle);
                }
                break;
                
            case "img":
                // 이미지 처리
                String src = element.attr("src");
                String alt = element.attr("alt");
                if (src.startsWith("data:image")) {
                    // Base64 이미지를 Excel에 삽입
                    try {
                        String base64Data = src.substring(src.indexOf(",") + 1);
                        byte[] imageBytes = Base64.getDecoder().decode(base64Data);
                        
                        // 이미지를 위한 공간 확보
                        int imageStartRow = currentRow;
                        int imageHeight = 15; // 이미지가 차지할 행 수
                        for (int i = 0; i < imageHeight; i++) {
                            sheet.createRow(currentRow++);
                        }
                        
                        // 이미지 추가
                        int pictureIdx = sheet.getWorkbook().addPicture(imageBytes, 
                            src.contains("png") ? Workbook.PICTURE_TYPE_PNG : Workbook.PICTURE_TYPE_JPEG);
                        
                        XSSFDrawing drawing = sheet.createDrawingPatriarch();
                        XSSFClientAnchor anchor = drawing.createAnchor(
                            0, 0, 0, 0,
                            indent, imageStartRow, // 시작 열, 행
                            indent + 3, imageStartRow + imageHeight // 끝 열, 행
                        );
                        
                        drawing.createPicture(anchor, pictureIdx);
                        
                        // 이미지 설명 추가
                        if (!alt.isEmpty()) {
                            XSSFRow row = sheet.createRow(currentRow++);
                            XSSFCell cell = row.createCell(indent);
                            cell.setCellValue("(" + alt + ")");
                            
                            CellStyle altStyle = sheet.getWorkbook().createCellStyle();
                            Font font = sheet.getWorkbook().createFont();
                            font.setItalic(true);
                            font.setColor(IndexedColors.GREY_50_PERCENT.getIndex());
                            altStyle.setFont(font);
                            cell.setCellStyle(altStyle);
                        }
                        
                        currentRow++; // 이미지 후 여백
                        
                    } catch (Exception e) {
                        // 이미지 처리 실패 시 텍스트로 표시
                        XSSFRow row = sheet.createRow(currentRow++);
                        XSSFCell cell = row.createCell(indent);
                        cell.setCellValue("[이미지" + (alt.isEmpty() ? "" : ": " + alt) + "]");
                        
                        CellStyle imageStyle = sheet.getWorkbook().createCellStyle();
                        Font font = sheet.getWorkbook().createFont();
                        font.setItalic(true);
                        font.setColor(IndexedColors.GREY_50_PERCENT.getIndex());
                        imageStyle.setFont(font);
                        cell.setCellStyle(imageStyle);
                    }
                }
                break;
                
            case "strong":
            case "b":
            case "em":
            case "i":
            case "u":
            case "s":
            case "mark":
                // 인라인 스타일은 부모 p/div 태그에서 RichText로 처리됨
                break;
                
            case "br":
                // 줄바꿈 - 빈 행 추가
                currentRow++;
                break;
                
            case "hr":
                // 수평선
                XSSFRow hrRow = sheet.createRow(currentRow++);
                XSSFCell hrCell = hrRow.createCell(0);
                hrCell.setCellValue("────────────────────────");
                sheet.addMergedRegion(new CellRangeAddress(currentRow-1, currentRow-1, 0, 5));
                break;
                
            default:
                // 기타 요소들은 재귀적으로 처리
                for (Element child : element.children()) {
                    currentRow = parseElement(child, sheet, currentRow, tableCellStyle, tableHeaderStyle, indent);
                }
                break;
        }
        
        return currentRow;
    }
    
    /**
     * HTML 표를 Excel로 변환합니다.
     * TipTap 에디터의 표 구조를 정확히 처리합니다.
     */
    private int parseTableToExcel(Element table, XSSFSheet sheet, int startRow, 
                                  CellStyle tableCellStyle, CellStyle tableHeaderStyle) {
        int currentRow = startRow;
        List<List<CellInfo>> tableData = new ArrayList<>();
        
        // tbody 또는 직접 tr 찾기
        Elements tbody = table.select("tbody");
        Elements rows = tbody.isEmpty() ? table.select("> tr") : tbody.first().select("> tr");
        
        // 먼저 전체 표 구조를 분석하여 rowspan/colspan 처리
        int maxCols = 0;
        for (int rowIdx = 0; rowIdx < rows.size(); rowIdx++) {
            Element tr = rows.get(rowIdx);
            List<CellInfo> rowData = new ArrayList<>();
            
            Elements cells = tr.select("th, td");
            int colIdx = 0;
            
            for (Element cell : cells) {
                // 이미 차지된 셀 건너뛰기
                while (colIdx < rowData.size() && rowData.get(colIdx) != null) {
                    colIdx++;
                }
                
                boolean isHeader = cell.tagName().equals("th");
                int colspan = getIntAttr(cell, "colspan", 1);
                int rowspan = getIntAttr(cell, "rowspan", 1);
                
                // 현재 셀 정보 저장 - element를 포함하여 서식 정보 유지
                CellInfo cellInfo = new CellInfo(cell, isHeader, rowspan, colspan);
                
                // colspan과 rowspan 영역 채우기
                for (int r = 0; r < rowspan; r++) {
                    if (rowIdx + r >= tableData.size()) {
                        tableData.add(new ArrayList<>());
                    }
                    List<CellInfo> targetRow = tableData.get(rowIdx + r);
                    
                    for (int c = 0; c < colspan; c++) {
                        while (targetRow.size() <= colIdx + c) {
                            targetRow.add(null);
                        }
                        targetRow.set(colIdx + c, r == 0 && c == 0 ? cellInfo : null);
                    }
                }
                
                colIdx += colspan;
            }
            
            if (rowIdx >= tableData.size()) {
                tableData.add(rowData);
            }
            
            maxCols = Math.max(maxCols, colIdx);
        }
        
        // Excel로 렌더링
        for (int rowIdx = 0; rowIdx < tableData.size(); rowIdx++) {
            XSSFRow excelRow = sheet.createRow(currentRow + rowIdx);
            List<CellInfo> rowData = tableData.get(rowIdx);
            
            for (int colIdx = 0; colIdx < rowData.size(); colIdx++) {
                CellInfo cellInfo = rowData.get(colIdx);
                if (cellInfo != null) {
                    XSSFCell cell = excelRow.createCell(colIdx);
                    
                    // RichText로 처리하여 서식 유지
                    if (cellInfo.element != null) {
                        try {
                            XSSFRichTextString richText = parseRichText(cellInfo.element, sheet.getWorkbook());
                            if (richText != null && richText.getString() != null && richText.length() > 0) {
                                cell.setCellValue(richText);
                            } else {
                                cell.setCellValue(cellInfo.text);
                            }
                        } catch (Exception e) {
                            // RichText 처리 실패 시 일반 텍스트 사용
                            cell.setCellValue(cellInfo.text);
                        }
                    } else {
                        cell.setCellValue(cellInfo.text);
                    }
                    
                    cell.setCellStyle(cellInfo.isHeader ? tableHeaderStyle : tableCellStyle);
                    
                    // 병합 처리
                    if (cellInfo.rowspan > 1 || cellInfo.colspan > 1) {
                        sheet.addMergedRegion(new CellRangeAddress(
                            currentRow + rowIdx,
                            currentRow + rowIdx + cellInfo.rowspan - 1,
                            colIdx,
                            colIdx + cellInfo.colspan - 1
                        ));
                    }
                }
            }
        }
        
        return currentRow + tableData.size();
    }
    
    /**
     * 속성값을 정수로 가져옵니다.
     */
    private int getIntAttr(Element element, String attr, int defaultValue) {
        String value = element.attr(attr);
        if (value.isEmpty()) {
            return defaultValue;
        }
        try {
            return Integer.parseInt(value);
        } catch (NumberFormatException e) {
            return defaultValue;
        }
    }
    
    /**
     * HTML 요소를 RichText로 파싱하여 서식을 유지합니다.
     */
    private XSSFRichTextString parseRichText(Element element, XSSFWorkbook workbook) {
        XSSFRichTextString richText = new XSSFRichTextString("");  // 빈 문자열로 초기화
        parseElementToRichText(element, richText, workbook, new StyleInfo());
        return richText;
    }
    
    /**
     * 재귀적으로 요소를 파싱하여 RichText에 추가합니다.
     */
    private void parseElementToRichText(Element element, XSSFRichTextString richText, 
                                       XSSFWorkbook workbook, StyleInfo parentStyle) {
        // 현재 요소의 스타일 정보
        StyleInfo currentStyle = parentStyle.clone();
        
        // 태그에 따른 스타일 업데이트
        String tagName = element.tagName();
        switch (tagName) {
            case "strong":
            case "b":
                currentStyle.bold = true;
                break;
            case "em":
            case "i":
                currentStyle.italic = true;
                break;
            case "u":
                currentStyle.underline = true;
                break;
            case "s":
            case "del":
            case "strike":
                currentStyle.strikethrough = true;
                break;
            case "mark":
                currentStyle.backgroundColor = IndexedColors.YELLOW.getIndex();
                break;
            case "span":
                // span의 style 속성 파싱
                String style = element.attr("style");
                if (style.contains("color:")) {
                    String color = extractColorFromStyle(style);
                    currentStyle.textColor = getColorIndex(color);
                }
                if (style.contains("background-color:")) {
                    String bgColor = extractBackgroundColorFromStyle(style);
                    currentStyle.backgroundColor = getColorIndex(bgColor);
                }
                break;
        }
        
        // 자식 노드 처리
        for (int i = 0; i < element.childNodeSize(); i++) {
            org.jsoup.nodes.Node node = element.childNode(i);
            
            if (node instanceof org.jsoup.nodes.TextNode) {
                // 텍스트 노드
                String text = ((org.jsoup.nodes.TextNode) node).text();
                if (!text.isEmpty()) {
                    // richText가 null인지 확인
                    if (richText.getString() == null) {
                        richText = new XSSFRichTextString(text);
                    } else {
                        int startIndex = richText.length();
                        richText.append(text);
                        
                        // 스타일 적용
                        if (currentStyle.hasStyle()) {
                            Font font = workbook.createFont();
                            font.setBold(currentStyle.bold);
                            font.setItalic(currentStyle.italic);
                            if (currentStyle.underline) {
                                font.setUnderline(Font.U_SINGLE);
                            }
                            font.setStrikeout(currentStyle.strikethrough);
                            if (currentStyle.textColor != null) {
                                font.setColor(currentStyle.textColor);
                            }
                            richText.applyFont(startIndex, richText.length(), font);
                        }
                    }
                }
            } else if (node instanceof Element) {
                // 요소 노드
                parseElementToRichText((Element) node, richText, workbook, currentStyle);
            }
        }
    }
    
    /**
     * style 속성에서 color 추출
     */
    private String extractColorFromStyle(String style) {
        int colorIndex = style.indexOf("color:");
        if (colorIndex != -1) {
            int endIndex = style.indexOf(";", colorIndex);
            if (endIndex == -1) endIndex = style.length();
            return style.substring(colorIndex + 6, endIndex).trim();
        }
        return "";
    }
    
    /**
     * style 속성에서 background-color 추출
     */
    private String extractBackgroundColorFromStyle(String style) {
        int colorIndex = style.indexOf("background-color:");
        if (colorIndex != -1) {
            int endIndex = style.indexOf(";", colorIndex);
            if (endIndex == -1) endIndex = style.length();
            return style.substring(colorIndex + 17, endIndex).trim();
        }
        return "";
    }
    
    /**
     * 색상 문자열을 POI 색상 인덱스로 변환
     */
    private Short getColorIndex(String color) {
        if (color.isEmpty()) return null;
        
        // RGB 형식 처리
        if (color.startsWith("rgb(")) {
            String[] rgb = color.substring(4, color.length() - 1).split(",");
            int r = Integer.parseInt(rgb[0].trim());
            int g = Integer.parseInt(rgb[1].trim());
            int b = Integer.parseInt(rgb[2].trim());
            
            // 근사치 색상 찾기
            if (r > 200 && g < 100 && b < 100) return IndexedColors.RED.getIndex();
            if (r < 100 && g > 200 && b < 100) return IndexedColors.GREEN.getIndex();
            if (r < 100 && g < 100 && b > 200) return IndexedColors.BLUE.getIndex();
            if (r > 200 && g > 200 && b < 100) return IndexedColors.YELLOW.getIndex();
            if (r > 200 && g > 100 && b < 100) return IndexedColors.ORANGE.getIndex();
            if (r > 100 && g < 100 && b > 100) return IndexedColors.VIOLET.getIndex();
        }
        
        // 색상 이름 처리
        switch (color.toLowerCase()) {
            case "red": return IndexedColors.RED.getIndex();
            case "green": return IndexedColors.GREEN.getIndex();
            case "blue": return IndexedColors.BLUE.getIndex();
            case "yellow": return IndexedColors.YELLOW.getIndex();
            case "orange": return IndexedColors.ORANGE.getIndex();
            case "purple": 
            case "violet": return IndexedColors.VIOLET.getIndex();
            case "black": return IndexedColors.BLACK.getIndex();
            case "white": return IndexedColors.WHITE.getIndex();
            case "gray":
            case "grey": return IndexedColors.GREY_50_PERCENT.getIndex();
            default: return null;
        }
    }
    
    /**
     * 스타일 정보를 저장하는 내부 클래스
     */
    private static class StyleInfo implements Cloneable {
        boolean bold = false;
        boolean italic = false;
        boolean underline = false;
        boolean strikethrough = false;
        Short textColor = null;
        Short backgroundColor = null;
        
        boolean hasStyle() {
            return bold || italic || underline || strikethrough || 
                   textColor != null || backgroundColor != null;
        }
        
        @Override
        public StyleInfo clone() {
            try {
                return (StyleInfo) super.clone();
            } catch (CloneNotSupportedException e) {
                StyleInfo copy = new StyleInfo();
                copy.bold = this.bold;
                copy.italic = this.italic;
                copy.underline = this.underline;
                copy.strikethrough = this.strikethrough;
                copy.textColor = this.textColor;
                copy.backgroundColor = this.backgroundColor;
                return copy;
            }
        }
    }
    
    /**
     * 표 셀 정보를 저장하는 내부 클래스
     */
    private static class CellInfo {
        String text;
        boolean isHeader;
        int rowspan;
        int colspan;
        Element element;
        
        CellInfo(String text, boolean isHeader, int rowspan, int colspan) {
            this.text = text;
            this.isHeader = isHeader;
            this.rowspan = rowspan;
            this.colspan = colspan;
        }
        
        CellInfo(Element element, boolean isHeader, int rowspan, int colspan) {
            this.element = element;
            this.text = element.text();
            this.isHeader = isHeader;
            this.rowspan = rowspan;
            this.colspan = colspan;
        }
    }
    
    /**
     * HTML 리스트를 Excel로 변환합니다.
     */
    private int parseListToExcel(Element list, XSSFSheet sheet, int startRow, boolean isOrdered) {
        int currentRow = startRow;
        int index = 1;
        
        Elements items = list.select("> li");
        for (Element li : items) {
            XSSFRow row = sheet.createRow(currentRow++);
            XSSFCell cell = row.createCell(0);
            String prefix = isOrdered ? index++ + ". " : "• ";
            cell.setCellValue(prefix + li.text());
            sheet.addMergedRegion(new CellRangeAddress(currentRow-1, currentRow-1, 0, 3));
        }
        
        return currentRow;
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