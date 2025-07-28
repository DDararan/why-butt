# 동기화 문제 디버깅 가이드

## 🔍 현재 문제
- WebSocket 연결이 계속 끊어지고 재연결됨
- 작성한 글이 백엔드에 저장되지 않음
- React StrictMode로 인한 이중 렌더링

## ✅ 해결된 사항

### 1. React StrictMode 비활성화
- `index.tsx`에서 StrictMode 제거
- 이중 렌더링으로 인한 WebSocket 중복 연결 방지

### 2. WebSocket 연결 안정화
- mounted 플래그 사용하여 cleanup 관리
- 비동기 초기화로 안정적인 연결
- currentUser 의존성 제거로 불필요한 재연결 방지

### 3. Hocuspocus 서버 개선
- 문서 로드/저장 로직 개선
- 더 자세한 로깅 추가
- ProseMirror와 텍스트 형식 모두 지원

## 🧪 테스트 방법

### 1. 서버 재시작
```bash
# 1. 모든 서버 종료 (Ctrl+C)

# 2. 백엔드 서버 시작
./mvnw spring-boot:run

# 3. Hocuspocus 서버 시작
cd frontend
npm run hocuspocus

# 4. 프론트엔드 시작
cd frontend
npm start
```

### 2. 동기화 확인
1. 브라우저 개발자 도구 콘솔 열기
2. 페이지 편집 화면 접속
3. 콘솔에서 다음 확인:
   - "WebSocket 상태: connected" 메시지
   - "문서 동기화 상태: true" 메시지
   - "에디터 생성됨, 협업 모드: true" 메시지

### 3. 저장 확인
1. 텍스트 입력
2. 5초 기다리기 (디바운스)
3. Hocuspocus 서버 콘솔에서 "문서 저장됨" 메시지 확인
4. 페이지 새로고침 후 내용 유지 확인

## 🛠 추가 디버깅

### WebSocket 상태 확인
```javascript
// 브라우저 콘솔에서 실행
document.querySelectorAll('[class*="editor"]').forEach(el => {
  console.log('Editor element:', el);
});
```

### IndexedDB 확인
1. 개발자 도구 > Application > Storage > IndexedDB
2. "yjs-demo" 데이터베이스 확인
3. 저장된 문서 데이터 확인

### 네트워크 탭 확인
1. 개발자 도구 > Network > WS
2. WebSocket 연결 상태 확인
3. 메시지 주고받기 확인

## 📋 체크리스트

- [ ] WebSocket 연결이 안정적으로 유지됨
- [ ] 텍스트 입력 시 실시간 동기화
- [ ] 5초 후 백엔드에 자동 저장
- [ ] 페이지 새로고침 후 내용 유지
- [ ] 다른 브라우저에서 실시간 확인 가능
- [ ] 연결 끊김 후 자동 재연결

## 🚨 주의사항

1. **포트 확인**: 1234, 3000, 8181 포트가 모두 열려있어야 함
2. **토큰 확인**: localStorage에 authToken이 있어야 함
3. **페이지 ID**: pageId가 0이 아닌 실제 값이어야 함

## 🔧 문제 지속 시

1. 모든 서버 재시작
2. 브라우저 캐시 및 IndexedDB 삭제
3. 새 시크릿 창에서 테스트
4. 네트워크 프록시/VPN 비활성화