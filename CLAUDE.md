# Wiki Collaboration System (why-butt)

## 프로젝트 개요
Y.js 기반 실시간 협업 위키 시스템입니다. Spring Boot 백엔드와 React 프론트엔드로 구성되어 있으며, 실시간 동시 편집 기능을 제공합니다.

## 최근 주요 변경사항 (2025-07-29)
- ✅ Y.js 실시간 협업 문제 해결
  - 초기 동기화 로직 제거 (반복적인 동기화 문제 해결)
  - Y.js 표준 프로토콜 구현 (Step1 → Step2 → Updates)
  - Room별 Y.js 문서 관리 (마지막 사용자 퇴장 시 즉시 메모리 정리)
- ✅ WebSocket 안정성 개선
  - 세션 상태 확인 추가 (ClosedChannelException 방지)
  - 안전한 연결 종료 처리
- ✅ 로깅 개선
  - 초기 동기화와 실시간 수정 구분 로깅
  - 디버깅을 위한 상세 로그 추가

## 기술 스택

### 백엔드
- **Framework**: Spring Boot 3.3.1
- **Language**: Java 21
- **Database**: H2 (파일 기반)
- **Build Tool**: Maven (Wrapper 포함)
- **주요 라이브러리**:
  - Spring Data JPA
  - Spring WebSocket
  - Apache POI (문서 내보내기)
  - Lombok

### 프론트엔드
- **Framework**: React 18.2.0
- **Language**: TypeScript
- **상태 관리**: Redux Toolkit
- **UI 라이브러리**: Material-UI (MUI) v5
- **에디터**: TipTap v2
- **실시간 협업**: Y.js, Y-WebSocket
- **스타일**: Emotion (CSS-in-JS)

## 주요 기능

### 위키 기능
- 계층형 페이지 구조 (부모-자식 관계)
- 페이지 CRUD 작업
- 페이지 타입 관리 (MENU, CONTENT 등)
- 드래그 앤 드롭으로 페이지 순서 및 계층 구조 변경
- 페이지 히스토리 관리 및 복원
- 제목 및 내용 통합 검색

### 실시간 협업
- Y.js 기반 동시 편집
- WebSocket을 통한 실시간 동기화
- 사용자별 커서 표시
- 자동 저장 (5초 간격)
- 충돌 없는 병합 (CRDT)

### 부가 기능
- 댓글 시스템
- 파일 첨부 및 관리
- 문서 내보내기 (DOCX, XLSX 형식)
- 사용자 인증 (세션 기반)
- 최근 수정된 페이지 조회

## 프로젝트 구조

```
ttt/
├── src/main/java/com/wiki/       # 백엔드 소스
│   ├── config/                   # 설정 클래스
│   ├── controller/               # REST API 컨트롤러
│   ├── dto/                      # 데이터 전송 객체
│   ├── entity/                   # JPA 엔티티
│   ├── repository/               # JPA 레포지토리
│   ├── service/                  # 비즈니스 로직
│   └── websocket/                # WebSocket 핸들러
├── frontend/                     # 프론트엔드 소스
│   ├── src/
│   │   ├── components/           # React 컴포넌트
│   │   ├── pages/                # 페이지 컴포넌트
│   │   ├── services/             # API 서비스
│   │   ├── types/                # TypeScript 타입 정의
│   │   └── contexts/             # React Context
│   └── package.json
├── data/                         # H2 데이터베이스 파일
├── uploads/                      # 업로드된 파일 저장
└── pom.xml                       # Maven 설정
```

## API 엔드포인트

### 위키 페이지 API
- `GET /api/wiki/pages` - 전체 페이지 목록 조회
- `GET /api/wiki/pages/{title}` - 특정 페이지 조회
- `GET /api/wiki/pages/id/{id}` - ID로 페이지 조회
- `POST /api/wiki/pages` - 새 페이지 생성
- `PUT /api/wiki/pages/{title}` - 페이지 수정
- `DELETE /api/wiki/pages/{title}` - 페이지 삭제
- `GET /api/wiki/search/full?query={query}` - 통합 검색
- `PUT /api/wiki/pages/order` - 페이지 순서 변경
- `PUT /api/wiki/pages/parent` - 페이지 부모 변경

### 사용자 API
- `POST /api/users/login` - 로그인
- `POST /api/users/logout` - 로그아웃
- `GET /api/users/me` - 현재 사용자 정보

### 댓글 API
- `GET /api/comments/page/{pageId}` - 페이지 댓글 조회
- `POST /api/comments` - 댓글 작성
- `PUT /api/comments/{id}` - 댓글 수정
- `DELETE /api/comments/{id}` - 댓글 삭제

### 파일 API
- `POST /api/files/upload` - 파일 업로드
- `GET /api/files/{id}/download` - 파일 다운로드
- `DELETE /api/files/{id}` - 파일 삭제

### WebSocket
- `/yjs` - Y.js 실시간 동기화 엔드포인트

## 빌드 및 실행

### 개별 실행

#### 백엔드 서버
```bash
# Windows
mvnw.cmd spring-boot:run

# Linux/Mac
./mvnw spring-boot:run
```

#### 프론트엔드 서버
```bash
cd frontend
npm install
npm start
```

### 접속 주소
- 프론트엔드: http://localhost:3000
- 백엔드 API: http://localhost:8181
- H2 Console: http://localhost:8181/h2-console

## 환경 설정

### 백엔드 설정 (application.properties)
- 포트: 8181
- 데이터베이스: H2 파일 기반 (./data/wikidb)
- 세션 타임아웃: 30분
- 파일 업로드 제한: 10MB

### 프론트엔드 설정
- 개발 서버 포트: 3000
- 프록시: http://localhost:8181 (백엔드 API)

## 개발 참고사항

### 실시간 협업 구현
- Y.js Document는 pageId별로 관리됨 (각 페이지가 하나의 room)
- WebSocket 세션은 loginId 기반으로 인증
- 10초마다 자동 저장 실행 (더티 문서만)
- 문서 변경사항은 바이너리 형태로 전송

#### Y.js 동기화 프로토콜
1. **초기 동기화 (페이지 진입 시)**
   - 클라이언트 → 서버: SYNC_STEP1 (상태 벡터 전송)
   - 서버 → 클라이언트: SYNC_STEP2 (빈 응답)
   - 서버 → 클라이언트: SYNC_UPDATE (저장된 업데이트들)
   - 클라이언트가 Step2를 받으면 자동으로 동기화 완료 인식

2. **실시간 동기화 (편집 시)**
   - 클라이언트 → 서버: SYNC_UPDATE (변경사항)
   - 서버 → 다른 클라이언트들: SYNC_UPDATE (브로드캐스트)

#### WebSocket 핸들러 구조
- `YjsWebSocketHandler`: 메인 WebSocket 핸들러
- `YjsDocument`: Room별 문서 상태 관리 (업데이트 저장, 버전 관리)
- Room 정리: 마지막 사용자 퇴장 시 즉시 메모리에서 제거

### 보안 고려사항
- 세션 기반 인증 사용
- CORS 설정으로 허용된 도메인만 접근 가능
- 파일 업로드 시 확장자 및 크기 검증

### 성능 최적화
- JPA 지연 로딩 사용
- 페이지 트리 구조는 재귀적으로 로드
- 프론트엔드에서 React.memo 사용으로 불필요한 렌더링 방지

## 향후 개선사항
- 사용자 권한 관리 시스템
- 마크다운 에디터 고도화
- 검색 성능 최적화
- 백업 및 복구 기능
- 다국어 지원
- Y.js 업데이트 압축 및 스냅샷 기능
- 상태 벡터 기반 차등 동기화