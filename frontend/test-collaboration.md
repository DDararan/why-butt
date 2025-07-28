# 동시편집 기능 테스트 가이드

## 1. 서버 시작

### Backend 서버 (Spring Boot)
```bash
cd C:\raran\ttt
./gradlew bootRun
```
또는 IntelliJ에서 실행

### Hocuspocus 서버 (WebSocket)
```bash
cd C:\raran\ttt\frontend
npm run hocuspocus
```

### Frontend 서버 (React)
```bash
cd C:\raran\ttt\frontend
npm start
```

## 2. 테스트 절차

### 2.1 기본 동작 확인
1. http://localhost:3000 접속
2. 로그인 (기존 사용자 계정 사용)
3. 새 페이지 생성 (페이지신규 버튼 클릭)
4. 제목과 내용 입력 후 저장
5. 생성된 페이지에서 "페이지 수정" 클릭

### 2.2 동시편집 테스트
1. 두 개의 브라우저 창/탭 열기 (예: Chrome + Chrome Incognito)
2. 각각 다른 사용자로 로그인
3. 동일한 페이지의 수정 화면으로 이동
4. 다음 항목들을 확인:
   - 연결 상태 표시 (연결됨/연결 끊김)
   - 온라인 사용자 목록 표시
   - 실시간 편집 내용 동기화
   - 다른 사용자의 커서 위치 표시
   - 텍스트 입력 시 즉시 반영

### 2.3 추가 테스트 시나리오
- 한 명이 편집 중 다른 사용자가 접속
- 네트워크 연결 끊김 후 재연결
- 여러 사용자가 동시에 같은 위치 편집
- 테이블, 리스트 등 복잡한 요소 편집

## 3. 예상되는 문제 해결

### WebSocket 연결 실패
- Hocuspocus 서버가 실행 중인지 확인
- 콘솔에서 ws://localhost:1234 연결 오류 확인
- 토큰 인증 문제 확인

### 동기화 오류
- 브라우저 콘솔에서 Yjs 관련 오류 메시지 확인
- "Unexpected end of array" 오류가 여전히 발생하는 경우 서버 재시작

### 커서가 보이지 않음
- CollaborationCursor extension이 제대로 로드되었는지 확인
- Awareness 상태가 올바르게 설정되었는지 확인

## 4. 로그 확인 위치

### Frontend 콘솔
- 브라우저 개발자 도구 > Console
- WebSocket 연결 상태, Yjs 동기화 메시지 확인

### Hocuspocus 서버 콘솔
- 연결/연결 해제 메시지
- 문서 로드/저장 메시지
- 인증 관련 메시지

### Backend 서버 콘솔
- API 호출 로그
- 문서 저장 관련 로그