# TTT Wiki 실시간 동시편집 - 빠른 시작 가이드

## 🚀 30초 만에 시작하기

### 1. 모든 서버 한번에 실행 (Windows)
```bash
start-all-servers.bat
```

### 2. 개별 실행 방법

#### 백엔드 서버 (터미널 1)
```bash
./mvnw spring-boot:run
```

#### Hocuspocus 협업 서버 (터미널 2)
```bash
cd frontend
npm run hocuspocus
```

#### 프론트엔드 서버 (터미널 3)
```bash
cd frontend
npm start
```

## 🌐 접속하기

1. 브라우저에서 http://localhost:3000 접속
2. 기본 계정으로 로그인:
   - 아이디: `user`
   - 비밀번호: `password`
3. 문서 편집 페이지로 이동
4. 다른 브라우저나 탭에서 같은 문서 열기
5. 실시간 동시편집 확인!

## 🎯 주요 기능

- ✨ **실시간 동시편집**: 여러 사용자가 동시에 편집
- 👥 **사용자 커서**: 다른 사용자의 커서 위치 표시
- 🟢 **연결 상태**: 실시간 연결 상태 확인
- 💾 **자동 저장**: 5초마다 자동 저장

## 🛠 포트 정보

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8181`
- WebSocket: `ws://localhost:1234`

## ❓ 문제 해결

### 서버가 시작되지 않을 때
1. Java 21이 설치되어 있는지 확인
2. Node.js 18 이상이 설치되어 있는지 확인
3. 포트가 사용 중인지 확인 (3000, 8181, 1234)

### 연결이 안 될 때
1. 모든 서버가 실행 중인지 확인
2. 브라우저 콘솔에서 에러 확인
3. 방화벽 설정 확인

## 📝 기본 사용자 정보

```
아이디: user
비밀번호: password
```

다른 사용자로 테스트하려면 data.sql에서 사용자 추가 가능