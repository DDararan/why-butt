# 문제 해결 가이드

## 🐛 TypeScript 컴파일 오류 해결

### 문제 1: HocuspocusProvider import 오류
```
Module '"@hocuspocus/provider"' has no exported member 'HocuspocusProvider'
```

**해결 방법**: 
- @hocuspocus/provider 대신 y-websocket의 WebsocketProvider 사용
- SimpleCollaborativeEditor 컴포넌트 생성

### 문제 2: TableToolbar, MarkdownButton 컴포넌트 누락
```
Property 'handleToolbarClick' is missing in type
Property 'children' is missing in type
```

**해결 방법**:
- 존재하지 않는 컴포넌트 import 제거
- 인라인 버튼으로 대체

### 문제 3: Collaboration extension 타입 오류
```
Type 'CollaborationOptions' is missing the following properties
```

**해결 방법**:
- extensions 배열에 any[] 타입 지정
- React.useMemo로 extensions 래핑

## 🔧 서버 실행 오류 해결

### 문제: Hocuspocus Server API 변경
```
TypeError: Server.configure is not a function
```

**해결 방법**:
```javascript
// 이전 (오류)
const server = Server.configure({...})

// 수정 후
const server = new Server({...})
```

### 문제: Java 컴파일 오류
```
cannot find symbol: method builder()
```

**해결 방법**:
- User 엔티티 구조에 맞게 메서드 수정
- SimpleUserDto 생성하여 사용
- loginId, staffId, userName 필드명 확인

## 📝 일반적인 문제 해결

### 포트 충돌
```bash
# Windows에서 포트 사용 확인
netstat -ano | findstr :1234
netstat -ano | findstr :3000
netstat -ano | findstr :8181

# 프로세스 종료
taskkill /PID [프로세스ID] /F
```

### npm 패키지 문제
```bash
# 캐시 정리 및 재설치
cd frontend
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

### WebSocket 연결 실패
1. Hocuspocus 서버 실행 확인
2. 포트 1234 방화벽 허용
3. 브라우저 콘솔에서 WebSocket 오류 확인

### 데이터베이스 오류
```bash
# H2 데이터베이스 초기화
rm wikidb.mv.db wikidb.trace.db
./mvnw spring-boot:run
```

## 🚀 권장 실행 순서

1. **백엔드 서버 시작**
   ```bash
   ./mvnw spring-boot:run
   ```
   - 포트 8181 확인
   - 데이터베이스 초기화 확인

2. **Hocuspocus 서버 시작**
   ```bash
   cd frontend
   npm run hocuspocus
   ```
   - "Ready." 메시지 확인
   - 포트 1234 확인

3. **프론트엔드 시작**
   ```bash
   cd frontend
   npm start
   ```
   - 컴파일 오류 없음 확인
   - 포트 3000 확인

## 📞 추가 지원

문제가 지속되면:
1. 브라우저 개발자 도구 콘솔 확인
2. 서버 로그 확인
3. `npm run build`로 빌드 오류 확인