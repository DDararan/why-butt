# 실시간 동기화 디버깅 가이드

## 문제 진단

현재 실시간 동기화가 작동하지 않는 이유:

1. **캐시 문제**: React 개발 서버가 이전 버전의 YjsEditor를 캐싱하고 있음
2. **WebSocket 서버 부재**: y-websocket은 전용 Node.js 서버가 필요함
3. **Java 백엔드 한계**: 현재 Java 백엔드는 Yjs 프로토콜을 완전히 구현하지 못함

## 해결 방법

### 1. Y-WebSocket 서버 실행

```bash
cd /home/raran/ttt/frontend

# y-websocket 서버 실행 (포트 4444)
node yjs-server.js
```

### 2. React 개발 서버 재시작

새 터미널에서:
```bash
cd /home/raran/ttt/frontend

# 캐시 삭제
rm -rf node_modules/.cache

# React 서버 재시작
npm start
```

### 3. 브라우저에서 확인

1. 브라우저 개발자 도구 열기 (F12)
2. Console 탭에서 다음 로그 확인:
   - `[YJS] 연결 시작`
   - `[YJS] WebSocket 연결됨`
   - `[YJS] 동기화 상태: true`

### 4. 실시간 동기화 테스트

1. 같은 페이지를 두 개의 브라우저 탭에서 열기
2. 한 탭에서 타이핑하면 다른 탭에 즉시 반영되어야 함
3. 각 사용자의 커서가 다른 색상으로 표시됨

## 로그 확인 방법

### 프론트엔드 (브라우저 콘솔)
```javascript
// YjsEditor 관련
[YjsEditor] onUpdate
[YjsEditor] 협업 서비스 연결됨
[YjsEditor] Yjs 문서 업데이트

// YjsCollaborativeEditingService 관련
[YJS] 연결 시작
[YJS] WebSocket 상태 변경
[YJS] 동기화 상태
[YJS] 문서 업데이트
```

### Y-WebSocket 서버 (터미널)
```
[Y-WebSocket] 새 연결: /page-35
```

## 문제가 지속되면

1. **포트 확인**: 4444 포트가 사용 중인지 확인
   ```bash
   lsof -i :4444
   ```

2. **방화벽 확인**: WebSocket 연결이 차단되지 않는지 확인

3. **네트워크 탭 확인**: 브라우저 개발자 도구의 Network 탭에서 WebSocket 연결 확인
   - 상태: 101 Switching Protocols
   - 타입: websocket

4. **전체 재설치** (최후의 수단):
   ```bash
   cd /home/raran/ttt/frontend
   rm -rf node_modules package-lock.json
   npm install
   ```