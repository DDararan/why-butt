package com.wiki.websocket;

import com.wiki.service.WikiPageService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.BinaryMessage;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.BinaryWebSocketHandler;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.util.*;
import java.util.concurrent.*;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;

/**
 * Yjs WebSocket 핸들러
 * loginId 기반 세션 관리 및 pageId 기반 room 관리
 */
@Component
public class YjsWebSocketHandler extends BinaryWebSocketHandler {
    private static final Logger logger = LoggerFactory.getLogger(YjsWebSocketHandler.class);
    
    @Autowired
    private WikiPageService wikiPageService;
    
    // Room별 세션 관리 (pageId가 roomId 역할)
    private final Map<String, Set<WebSocketSession>> roomSessions = new ConcurrentHashMap<>();
    // 세션별 Room 매핑
    private final Map<String, String> sessionToRoom = new ConcurrentHashMap<>();
    // Room별 문서 상태 관리
    private final Map<String, YjsDocument> roomDocuments = new ConcurrentHashMap<>();
    
    // 세션별 사용자 정보 (loginId 기반)
    private final Map<String, UserInfo> sessionUserInfo = new ConcurrentHashMap<>();
    
    
    // 자동 저장을 위한 스케줄러
    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(1);
    // 변경된 문서 추적
    private final Set<String> dirtyDocuments = ConcurrentHashMap.newKeySet();
    
    // Yjs 프로토콜 메시지 타입
    private static final byte MESSAGE_SYNC = 0;
    private static final byte MESSAGE_AWARENESS = 1;
    private static final byte MESSAGE_AUTH = 2;
    private static final byte MESSAGE_QUERY_AWARENESS = 3;
    
    // Sync 메시지 서브타입
    private static final byte SYNC_STEP1 = 0;
    private static final byte SYNC_STEP2 = 1;
    private static final byte SYNC_UPDATE = 2;
    
    
    // 사용자 정보 클래스
    private static class UserInfo {
        String loginId;
        String userName;
        String pageId;
        long connectedAt;
        
        UserInfo(String loginId, String userName, String pageId) {
            this.loginId = loginId;
            this.userName = userName;
            this.pageId = pageId;
            this.connectedAt = System.currentTimeMillis();
        }
        
        @Override
        public String toString() {
            return String.format("UserInfo{loginId='%s', userName='%s', pageId='%s', connectedAt=%d}", 
                               loginId, userName, pageId, connectedAt);
        }
    }
    
    public YjsWebSocketHandler() {
        // 10초마다 변경된 문서들을 자동 저장
        scheduler.scheduleWithFixedDelay(this::saveAllDirtyDocuments, 10, 10, TimeUnit.SECONDS);
    }
    
    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        try {
            String uri = session.getUri().toString();
            String path = session.getUri().getPath();
            String query = session.getUri().getQuery();
            
            System.out.println("Y-WebSocket 연결 요청 상세정보:");
            System.out.println("  - URI: " + uri);
            System.out.println("  - Path: " + path);
            System.out.println("  - Query: " + query);
            
            // URL 파라미터 추출 및 디코딩
            Map<String, String> params = new HashMap<>();
            if (query != null) {
                String[] pairs = query.split("&");
                for (String pair : pairs) {
                    String[] keyValue = pair.split("=");
                    if (keyValue.length == 2) {
                        // URL 디코딩 추가
                        String key = URLDecoder.decode(keyValue[0], StandardCharsets.UTF_8);
                        String value = URLDecoder.decode(keyValue[1], StandardCharsets.UTF_8);
                        params.put(key, value);
                    }
                }
            }
            
            System.out.println("  - 디코딩된 파라미터: " + params);
            
            // Room 이름 추출 (pageId만 사용)
            String roomName = extractPageIdFromPath(path);
            String loginId = params.get("userId");
            String userName = params.get("userName");
            
            System.out.println("  - 추출된 roomName: " + roomName);
            System.out.println("  - 추출된 loginId: " + loginId);
            System.out.println("  - 추출된 userName: " + userName);
            
            if (roomName == null || loginId == null) {
                System.err.println("Y-WebSocket 연결 실패: 필수 파라미터 누락 - roomName: " + roomName + ", loginId: " + loginId);
                session.close();
                return;
            }
            
            // 사용자 정보 생성
            UserInfo userInfo = new UserInfo(loginId, userName, roomName);
            
            // 세션에 사용자 정보 저장
            sessionUserInfo.put(session.getId(), userInfo);
            
            // 세션과 룸 연결 (메시지 처리를 위해 필수!)
            sessionToRoom.put(session.getId(), roomName);
            
            // Room에 사용자 추가
            roomSessions.computeIfAbsent(roomName, k -> ConcurrentHashMap.newKeySet()).add(session);
            
            // YjsDocument 생성 (연결 시점에 생성하여 NullPointerException 방지)
            YjsDocument doc = roomDocuments.computeIfAbsent(roomName, k -> {
                System.out.println("Room " + k + "에 새 YjsDocument 생성");
                return new YjsDocument(k);
            });
            
            System.out.println("Y-WebSocket 연결 설정 완료:");
            System.out.println("  - loginId: " + loginId);
            System.out.println("  - userName: " + userName);
            System.out.println("  - pageId/roomName: " + roomName);
            System.out.println("  - 세션 ID: " + session.getId());
            System.out.println("  - sessionToRoom 매핑 완료");
            System.out.println("  - roomSessions 등록 완료");
            System.out.println("  - YjsDocument 생성/확인 완료: " + (doc != null ? "성공" : "실패"));
            
            System.out.println("Room " + roomName + " 현재 접속자 수: " + roomSessions.get(roomName).size());
            
            // Room 접속 중인 사용자들 출력
            System.out.println("Room " + roomName + " 접속 중인 사용자들:");
            roomSessions.get(roomName).forEach(s -> {
                UserInfo info = sessionUserInfo.get(s.getId());
                if (info != null) {
                    System.out.println("  - 세션: " + s.getId() + ", loginId: " + info.loginId + ", userName: " + info.userName);
                }
            });
            
            System.out.println("사용자 접속 완료 - Room: " + roomName + ", loginId: " + loginId + ", userName: " + userName);
            
        } catch (Exception e) {
            System.err.println("Y-WebSocket 연결 처리 중 오류 발생: " + e.getMessage());
            e.printStackTrace();
            session.close();
        }
    }
    
    @Override
    protected void handleBinaryMessage(WebSocketSession session, BinaryMessage message) throws Exception {
        // 세션 유효성 확인
        if (!session.isOpen()) {
            System.err.println("메시지 처리 실패: 세션 " + session.getId() + "이 이미 종료됨");
            return;
        }
        
        String roomName = sessionToRoom.get(session.getId());
        if (roomName == null) {
            System.err.println("메시지 처리 실패: 세션 " + session.getId() + "의 room을 찾을 수 없음");
            System.err.println("  - 현재 sessionToRoom 크기: " + sessionToRoom.size());
            System.err.println("  - 세션이 이미 정리되었거나 연결 설정이 완료되지 않았음");
            return;
        }
        
        byte[] payload = message.getPayload().array();
        if (payload.length == 0) {
            System.out.println("빈 메시지 수신 - 세션: " + session.getId());
            return;
        }
        
        byte messageType = payload[0];
        System.out.println("Y-WebSocket 메시지 수신:");
        System.out.println("  - 세션: " + session.getId());
        System.out.println("  - 룸: " + roomName);
        System.out.println("  - 메시지 타입: " + messageType);
        System.out.println("  - 메시지 크기: " + payload.length + " bytes");
        System.out.println("  - 세션 상태: " + (session.isOpen() ? "열림" : "닫힘"));
        
        switch (messageType) {
            case MESSAGE_SYNC:
                System.out.println("  - SYNC 메시지 처리 중...");
                handleSyncMessage(session, roomName, payload);
                break;
            case MESSAGE_AWARENESS:
                System.out.println("  - AWARENESS 메시지 처리 중...");
                handleAwarenessMessage(session, roomName, payload);
                break;
            case MESSAGE_AUTH:
                System.out.println("  - AUTH 메시지 처리 중...");
                handleAuthMessage(session, payload);
                break;
            case MESSAGE_QUERY_AWARENESS:
                System.out.println("  - QUERY_AWARENESS 메시지 처리 중...");
                handleQueryAwarenessMessage(session, roomName);
                break;
            default:
                System.err.println("알 수 없는 메시지 타입: " + messageType);
        }
    }
    
    private void handleSyncMessage(WebSocketSession session, String roomName, byte[] message) throws IOException {
        if (message.length < 2) {
            System.out.println("SYNC 메시지가 너무 짧음: " + message.length + " bytes");
            return;
        }
        
        byte syncType = message[1];
        YjsDocument doc = roomDocuments.get(roomName);
        
        // YjsDocument null check 추가
        if (doc == null) {
            System.err.println("SYNC 메시지 처리 실패: Room " + roomName + "의 YjsDocument를 찾을 수 없음");
            System.err.println("  - 현재 roomDocuments 크기: " + roomDocuments.size());
            
            // 문서가 없으면 새로 생성 시도
            doc = new YjsDocument(roomName);
            roomDocuments.put(roomName, doc);
            System.out.println("  - 새 YjsDocument 생성 및 등록 완료");
        }
        
        System.out.println("SYNC 메시지 처리:");
        System.out.println("  - Room: " + roomName);
        System.out.println("  - 세션: " + session.getId());
        System.out.println("  - SYNC 타입: " + syncType);
        System.out.println("  - YjsDocument 상태: " + (doc != null ? "정상" : "null"));
        
        switch (syncType) {
            case SYNC_STEP1:
                // 클라이언트가 상태 벡터를 보냄
                System.out.println("[초기동기화] ============= 초기 동기화 시작 =============");
                System.out.println("[초기동기화] Sync Step 1 수신 - Room: " + roomName + ", 세션: " + session.getId());
                
                // 클라이언트의 상태 벡터 읽기 (있는 경우)
                byte[] clientStateVector = null;
                if (message.length > 2) {
                    clientStateVector = Arrays.copyOfRange(message, 2, message.length);
                    System.out.println("  - 클라이언트 상태 벡터 크기: " + clientStateVector.length + " bytes");
                }
                
                // Y.js 문서 상태 로깅
                System.out.println("[Y.js 동기화] Room " + roomName + " 문서 상태:");
                System.out.println("  - 저장된 업데이트 개수: " + doc.getAllUpdates().size());
                System.out.println("  - 문서 버전: " + doc.getVersion());
                System.out.println("  - 요청 클라이언트: " + session.getId());
                
                // 현재 Room에 접속된 클라이언트 수
                Set<WebSocketSession> roomSessions = this.roomSessions.get(roomName);
                if (roomSessions != null) {
                    System.out.println("  - 현재 Room " + roomName + "에 " + roomSessions.size() + "명 접속 중");
                }
                
                // Step 2 응답 전송 (빈 응답)
                // Y.js는 Step2를 받으면 자동으로 동기화 완료로 인식
                if (session.isOpen()) {
                    ByteArrayOutputStream step2Out = new ByteArrayOutputStream();
                    step2Out.write(MESSAGE_SYNC);
                    step2Out.write(SYNC_STEP2);
                    session.sendMessage(new BinaryMessage(step2Out.toByteArray()));
                    System.out.println("  - [초기동기화] Sync Step2 빈 응답 전송");
                    
                    // 저장된 업데이트가 있으면 개별 UPDATE 메시지로 전송
                    List<byte[]> allUpdates = doc.getAllUpdates();
                    if (!allUpdates.isEmpty() && session.isOpen()) {
                        System.out.println("  - [초기동기화] 저장된 업데이트 " + allUpdates.size() + "개를 개별 전송");
                        for (int i = 0; i < allUpdates.size(); i++) {
                            if (!session.isOpen()) {
                                System.out.println("    - 세션이 닫혀 업데이트 전송 중단");
                                break;
                            }
                            ByteArrayOutputStream updateOut = new ByteArrayOutputStream();
                            updateOut.write(MESSAGE_SYNC);
                            updateOut.write(SYNC_UPDATE);
                            updateOut.write(allUpdates.get(i));
                            try {
                                session.sendMessage(new BinaryMessage(updateOut.toByteArray()));
                                System.out.println("    - 업데이트 " + (i + 1) + "/" + allUpdates.size() + " 전송");
                            } catch (IOException e) {
                                System.err.println("    - 업데이트 전송 실패: " + e.getMessage());
                                break;
                            }
                        }
                    }
                } else {
                    System.out.println("  - [초기동기화] 세션이 이미 닫혀 있어 응답 전송 불가");
                }
                
                System.out.println("  - [초기동기화] 초기 동기화 완료!");
                break;
                
            case SYNC_STEP2:
                // 서버가 보낸 Step 2에 대한 응답은 무시
                System.out.println("Sync Step 2 received (ignored) - Room: " + roomName);
                break;
                
            case SYNC_UPDATE:
                // 업데이트 수신 및 브로드캐스트
                System.out.println("[실시간수정] UPDATE 메시지 수신 - Room: " + roomName + ", 발신자: " + session.getId());
                if (message.length > 2) {
                    byte[] update = Arrays.copyOfRange(message, 2, message.length);
                    System.out.println("[키입력7] 업데이트 크기: " + update.length + " bytes");
                    
                    // 큰 업데이트(이미지 포함 가능성) 감지
                    if (update.length > 10000) {
                        System.out.println("[이미지업데이트] 큰 업데이트 감지 (" + update.length + " bytes) - 이미지 포함 가능성");
                        
                        // 업데이트 내용 일부 확인 (base64 이미지 패턴 찾기)
                        String updateStr = new String(update, java.nio.charset.StandardCharsets.UTF_8);
                        if (updateStr.contains("data:image")) {
                            System.out.println("[이미지업데이트] base64 이미지 데이터 감지됨");
                        }
                    }
                    
                    // 업데이트를 저장하고 브로드캐스트
                    doc.addUpdate(update);
                    dirtyDocuments.add(roomName);
                    System.out.println("[키입력8] YjsDocument에 업데이트 저장");
                    System.out.println("  - 현재 총 업데이트 개수: " + doc.getAllUpdates().size());
                    
                    // 본인을 제외한 다른 클라이언트에게 브로드캐스트
                    System.out.println("[키입력9] 다른 클라이언트에게 브로드캐스트 시작");
                    broadcastUpdate(roomName, session.getId(), update);
                    
                    System.out.println("업데이트 브로드캐스트 완료 - Room: " + roomName + 
                                     ", 발신자: " + session.getId() + 
                                     ", 크기: " + update.length + " bytes");
                } else {
                    System.out.println("업데이트 데이터가 없음 - 메시지 크기: " + message.length);
                }
                break;
            default:
                System.err.println("알 수 없는 SYNC 타입: " + syncType);
        }
    }
    
    private void handleAwarenessMessage(WebSocketSession session, String roomName, byte[] message) throws IOException {
        // Awareness 메시지를 다른 클라이언트에게 브로드캐스트
        System.out.println("Awareness 메시지 처리:");
        System.out.println("  - Room: " + roomName);
        System.out.println("  - 발신자: " + session.getId());
        System.out.println("  - 메시지 크기: " + message.length + " bytes");
        
        Set<WebSocketSession> sessions = roomSessions.get(roomName);
        if (sessions != null) {
            int successCount = 0;
            int failCount = 0;
            
            for (WebSocketSession s : sessions) {
                if (!s.getId().equals(session.getId()) && s.isOpen()) {
                    try {
                        s.sendMessage(new BinaryMessage(message));
                        successCount++;
                    } catch (IOException e) {
                        failCount++;
                        System.err.println("Awareness 메시지 전송 실패: " + e.getMessage());
                    }
                }
            }
            
            System.out.println("Awareness 브로드캐스트 완료 - Room: " + roomName + 
                             ", 발신자: " + session.getId() + 
                             ", 성공: " + successCount + "건, 실패: " + failCount + "건");
        } else {
            System.err.println("Awareness 브로드캐스트 실패: Room " + roomName + "의 세션 목록을 찾을 수 없음");
        }
    }
    
    private void handleAuthMessage(WebSocketSession session, byte[] message) {
        // 인증 메시지 처리 (현재는 간단히 로깅만)
        System.out.println("인증 메시지 수신 - 세션: " + session.getId() + ", 크기: " + message.length + " bytes");
    }
    
    private void handleQueryAwarenessMessage(WebSocketSession session, String roomName) throws IOException {
        // 현재 room의 모든 awareness 상태 전송
        System.out.println("Awareness 쿼리 - Room: " + roomName + ", 세션: " + session.getId());
        
        // 현재 접속한 사용자들의 정보 전송
        sendConnectedUsers(session, roomName);
        System.out.println("연결된 사용자 정보 전송 완료");
    }
    
    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        System.out.println("Y-WebSocket 연결 종료 시작 - 세션: " + session.getId());
        
        String roomName = sessionToRoom.remove(session.getId());
        UserInfo userInfo = sessionUserInfo.remove(session.getId());
        
        System.out.println("세션 정리 결과:");
        System.out.println("  - 제거된 roomName: " + roomName);
        System.out.println("  - 제거된 userInfo: " + (userInfo != null ? userInfo.loginId : "null"));
        System.out.println("  - sessionToRoom 크기: " + sessionToRoom.size());
        System.out.println("  - sessionUserInfo 크기: " + sessionUserInfo.size());
        
        if (roomName != null) {
            Set<WebSocketSession> sessions = roomSessions.get(roomName);
            if (sessions != null) {
                boolean removed = sessions.remove(session);
                System.out.println("  - roomSessions에서 제거 성공: " + removed);
                
                System.out.println("Y-WebSocket 연결 종료 - loginId: " + 
                           (userInfo != null ? userInfo.loginId : "unknown") +
                           ", pageId: " + roomName +
                           ", 세션: " + session.getId() +
                           ", 남은 접속자: " + sessions.size());
                
                if (sessions.isEmpty()) {
                    // 마지막 사용자가 나간 경우
                    roomSessions.remove(roomName);
                    saveDocumentIfDirty(roomName);
                    
                    // Y.js 문서를 즉시 메모리에서 제거
                    YjsDocument removedDoc = roomDocuments.remove(roomName);
                    if (removedDoc != null) {
                        System.out.println("  - 마지막 사용자 퇴장으로 Room " + roomName + " 세션 목록 및 Y.js 문서 제거");
                        System.out.println("    - 제거된 Y.js 문서의 업데이트 개수: " + removedDoc.getAllUpdates().size());
                    } else {
                        System.out.println("  - 마지막 사용자 퇴장으로 Room " + roomName + " 세션 목록 제거 (Y.js 문서는 이미 없음)");
                    }
                } else {
                    // 다른 사용자들에게 사용자 퇴장 알림
                    if (userInfo != null) {
                        broadcastUserLeft(roomName, session.getId(), userInfo.loginId);
                    }
                }
            } else {
                System.err.println("경고: Room " + roomName + "의 세션 목록을 찾을 수 없음");
            }
        } else {
            System.err.println("경고: 세션 " + session.getId() + "의 roomName을 찾을 수 없음");
        }
        
        System.out.println("Y-WebSocket 연결 종료 완료 - 세션: " + session.getId());
    }
    
    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) throws Exception {
        logger.error("Y-WebSocket 전송 오류 - 세션: {}, 오류: {}", session.getId(), exception.getMessage());
        
        // 이미 닫힌 세션인 경우 무시
        if (session.isOpen()) {
            try {
                session.close();
            } catch (IOException e) {
                logger.debug("이미 닫힌 세션 - 무시: {}", session.getId());
            }
        }
    }
    
    // 유틸리티 메서드들
    
    private String extractRoomName(String path) {
        // /ws/yjs/123 형식에서 123 추출 (마지막 세그먼트)
        if (path == null) return null;
        
        String[] parts = path.split("/");
        for (int i = parts.length - 1; i >= 0; i--) {
            String part = parts[i].trim();
            if (!part.isEmpty() && !part.equals("yjs") && !part.equals("ws")) {
                logger.info("Room 이름 추출: {} -> {}", path, part);
                return part;
            }
        }
        return null;
    }
    
    private Map<String, String> parseQueryParams(String query) {
        Map<String, String> params = new HashMap<>();
        if (query != null) {
            String[] pairs = query.split("&");
            for (String pair : pairs) {
                String[] keyValue = pair.split("=");
                if (keyValue.length == 2) {
                    try {
                        String key = keyValue[0];
                        String value = java.net.URLDecoder.decode(keyValue[1], "UTF-8");
                        params.put(key, value);
                    } catch (Exception e) {
                        logger.warn("쿼리 파라미터 디코딩 실패: {}", pair);
                    }
                }
            }
        }
        return params;
    }
    
    /**
     * Y.js Sync Step2 응답을 업데이트와 함께 전송
     * Y.js 프로토콜: MESSAGE_SYNC + SYNC_STEP2 + 단일 통합 업데이트
     */
    private void sendSyncStep2WithUpdates(WebSocketSession session, List<byte[]> updates) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        out.write(MESSAGE_SYNC);
        out.write(SYNC_STEP2);
        
        // 업데이트가 없으면 빈 Step2 전송
        if (updates == null || updates.isEmpty()) {
            session.sendMessage(new BinaryMessage(out.toByteArray()));
            System.out.println("  - Sync Step2 빈 응답 전송");
            return;
        }
        
        // 모든 업데이트를 하나의 메시지로 병합
        // Y.js는 Step2에서 단일 업데이트를 기대함
        ByteArrayOutputStream updateBuffer = new ByteArrayOutputStream();
        for (byte[] update : updates) {
            updateBuffer.write(update);
        }
        
        byte[] mergedUpdate = updateBuffer.toByteArray();
        
        // VarUint로 업데이트 길이 인코딩 (Y.js 프로토콜 요구사항)
        writeVarUint(out, mergedUpdate.length);
        out.write(mergedUpdate);
        
        byte[] message = out.toByteArray();
        session.sendMessage(new BinaryMessage(message));
        System.out.println("  - Sync Step2 전송 완료 (업데이트 포함, 전체 크기: " + message.length + " bytes)");
    }
    
    /**
     * Variable-length integer 인코딩 (Y.js 프로토콜용)
     */
    private void writeVarUint(ByteArrayOutputStream out, int value) {
        while (value > 127) {
            out.write((value & 127) | 128);
            value >>>= 7;
        }
        out.write(value & 127);
    }
    
    /**
     * 클라이언트에게 업데이트 전송
     * 각 업데이트를 개별 SYNC_UPDATE 메시지로 전송
     */
    private void sendUpdatesToClient(WebSocketSession session, List<byte[]> updates) throws IOException {
        for (int i = 0; i < updates.size(); i++) {
            byte[] update = updates.get(i);
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            out.write(MESSAGE_SYNC);
            out.write(SYNC_UPDATE);
            out.write(update);
            
            try {
                session.sendMessage(new BinaryMessage(out.toByteArray()));
                System.out.println("    - 업데이트 " + (i + 1) + "/" + updates.size() + " 전송 (크기: " + update.length + " bytes)");
            } catch (IOException e) {
                System.err.println("    - 업데이트 " + (i + 1) + " 전송 실패: " + e.getMessage());
                throw e;
            }
        }
    }
    
    private void broadcastUpdate(String roomName, String excludeSessionId, byte[] update) {
        Set<WebSocketSession> sessions = roomSessions.get(roomName);
        if (sessions == null) {
            System.out.println("[키입력10] 브로드캐스트 실패: Room " + roomName + "에 세션이 없음");
            return;
        }
        
        System.out.println("[키입력11] 브로드캐스트 시작");
        System.out.println("  - 룸: " + roomName);
        System.out.println("  - 발신자 제외: " + excludeSessionId);
        System.out.println("  - 업데이트 크기: " + update.length + " bytes");
        System.out.println("  - 룸 내 총 세션 수: " + sessions.size());
        
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try {
            out.write(MESSAGE_SYNC);
            out.write(SYNC_UPDATE);
            out.write(update);
        } catch (IOException e) {
            System.err.println("업데이트 메시지 생성 실패: " + e.getMessage());
            return;
        }
        
        byte[] message = out.toByteArray();
        int successCount = 0;
        int failCount = 0;
        
        for (WebSocketSession session : sessions) {
            if (!session.getId().equals(excludeSessionId)) {
                if (session.isOpen()) {
                    try {
                        System.out.println("[키입력12] 업데이트 전송 - 수신자: " + session.getId());
                        session.sendMessage(new BinaryMessage(message));
                        successCount++;
                    } catch (IOException e) {
                        failCount++;
                        System.err.println("[키입력13] 전송 실패: " + session.getId() + ", 오류: " + e.getMessage());
                        // 닫힌 세션은 목록에서 제거할 수 있도록 표시
                        if (e.getCause() instanceof java.nio.channels.ClosedChannelException) {
                            System.err.println("  - 채널이 닫혀 있음. 세션 정리 필요: " + session.getId());
                        }
                    }
                } else {
                    System.out.println("[키입력12-skip] 세션이 닫혀 있어 전송 건너뛰기: " + session.getId());
                }
            } else if (session.getId().equals(excludeSessionId)) {
                System.out.println("[키입력14] 발신자 제외: " + session.getId());
            }
        }
        
        System.out.println("[키입력15] 브로드캐스트 완료: 성공 " + successCount + "건, 실패 " + failCount + "건");
    }
    
    private void broadcastUserJoined(String roomName, String sessionId, String loginId, String userName) {
        // Awareness 업데이트로 사용자 접속 알림
        logger.info("사용자 접속 알림 - Room: {}, loginId: {}, userName: {}", roomName, loginId, userName);
    }
    
    private void broadcastUserLeft(String roomName, String sessionId, String loginId) {
        // Awareness 업데이트로 사용자 퇴장 알림
        logger.info("사용자 퇴장 알림 - Room: {}, loginId: {}", roomName, loginId);
    }
    
    private void sendConnectedUsers(WebSocketSession session, String roomName) {
        // 현재 접속한 사용자 목록 전송
        Set<WebSocketSession> sessions = roomSessions.get(roomName);
        if (sessions != null) {
            List<UserInfo> users = new ArrayList<>();
            for (WebSocketSession s : sessions) {
                UserInfo info = sessionUserInfo.get(s.getId());
                if (info != null) {
                    users.add(info);
                }
            }
            logger.debug("접속 사용자 목록 전송 - Room: {}, 사용자 수: {}", roomName, users.size());
        }
    }
    
    // concatenateUpdates 메소드는 더 이상 사용하지 않음
    // Y.js 프로토콜에 따라 각 업데이트는 개별적으로 전송되어야 함
    
    private void saveDocumentIfDirty(String roomName) {
        if (dirtyDocuments.remove(roomName)) {
            try {
                // pageId 추출 (단순히 roomName이 pageId)
                Long pageId = extractPageId(roomName);
                if (pageId != null) {
                    YjsDocument doc = roomDocuments.get(roomName);
                    if (doc != null) {
                        // Y.js 문서의 현재 내용을 가져와서 DB에 저장
                        // TODO: Y.js 문서를 HTML로 변환하는 로직 필요
                        // 현재는 주석 처리
                        // wikiPageService.updateContent(pageId, htmlContent);
                        logger.info("문서 저장 예약 - pageId: {}", pageId);
                    }
                }
            } catch (Exception e) {
                logger.error("문서 저장 실패 - room: {}, 오류: {}", roomName, e.getMessage());
            }
        }
    }
    
    private void saveAllDirtyDocuments() {
        Set<String> rooms = new HashSet<>(dirtyDocuments);
        for (String roomName : rooms) {
            saveDocumentIfDirty(roomName);
        }
    }
    
    private Long extractPageId(String roomName) {
        try {
            // roomName이 단순히 pageId인 경우
            return Long.parseLong(roomName);
        } catch (NumberFormatException e) {
            logger.warn("pageId 추출 실패: {}", roomName);
        }
        return null;
    }

    private String extractPageIdFromPath(String path) {
        // /ws/yjs/123 형식에서 123 추출 (마지막 세그먼트)
        if (path == null) return null;
        
        String[] parts = path.split("/");
        for (int i = parts.length - 1; i >= 0; i--) {
            String part = parts[i].trim();
            if (!part.isEmpty() && !part.equals("yjs") && !part.equals("ws")) {
                logger.info("Room 이름 추출: {} -> {}", path, part);
                return part;
            }
        }
        return null;
    }
}