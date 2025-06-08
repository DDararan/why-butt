# WHY-BUTT (와이벗) 위키 시스템

## 개요
Spring Boot + React 기반의 위키 시스템입니다.

## 새 기능 (v1.1.0)
🎉 **이미지 붙여넣기 자동 업로드 기능 추가!**
- 페이지 편집 시 이미지를 클립보드에서 붙여넣으면 자동으로 업로드
- 지원 형식: PNG, JPG, JPEG, GIF, BMP, WebP, SVG
- 파일 크기 제한: 10MB
- 자동 파일명 생성 및 날짜별 폴더 구성

## 시스템 요구사항
- Java 17 이상
- Windows/Linux/macOS 지원

## 설치 및 실행

### 1. 실행
```bash
# Windows
start.bat

# Linux/macOS  
chmod +x start.sh
./start.sh
```

### 2. 접속
- **메인 페이지**: http://localhost:8181
- **H2 데이터베이스 콘솔**: http://localhost:8181/h2-console

## H2 데이터베이스 접속 정보

H2 콘솔 (http://localhost:8181/h2-console)에서 다음 정보로 접속하세요:

- **Driver Class**: `org.h2.Driver` (기본값)
- **JDBC URL**: `jdbc:h2:file:./data/wiki-db`
- **User Name**: `sa`
- **Password**: `password`

⚠️ **중요**: JDBC URL을 정확히 입력해야 합니다. 다른 경로를 사용하면 데이터베이스를 찾을 수 없습니다.

## 기본 계정
- **관리자**: admin / admin123
- **일반 사용자**: user1 / user123

## 주요 기능
- 위키 페이지 작성/편집
- **🖼️ 이미지 붙여넣기 자동 업로드** (NEW!)
- 댓글 시스템  
- 사용자 인증
- 검색 기능
- 히스토리 관리
- 파일 첨부

## 이미지 업로드 사용법

### 1. 페이지 편집 모드에서:
1. 이미지를 클립보드에 복사 (스크린샷, 이미지 복사 등)
2. 편집 텍스트 영역에서 `Ctrl + V` (붙여넣기)
3. 자동으로 이미지가 업로드되고 마크다운 문법으로 삽입됩니다

### 2. 업로드된 이미지:
- 자동으로 `uploads/YYYY/MM/DD/` 폴더에 저장
- 고유한 파일명으로 자동 생성
- 웹에서 바로 접근 가능

## 폴더 구조
```
WHY-BUTT/
├── bin/           # 실행 파일
├── config/        # 설정 파일
├── data/          # 데이터베이스 파일 (자동 생성)
├── logs/          # 로그 파일 (자동 생성)
├── uploads/       # 업로드된 이미지 파일 (자동 생성)
├── start.bat      # Windows 실행 스크립트
├── start.sh       # Linux/macOS 실행 스크립트
└── README.md      # 이 파일
```

## 문제 해결

### H2 데이터베이스 접속 오류
만약 H2 콘솔에서 데이터베이스에 접속할 수 없다면:
1. JDBC URL이 `jdbc:h2:file:./data/wiki-db` 인지 확인
2. 서버가 실행 중인지 확인
3. data 폴더에 wiki-db.mv.db 파일이 생성되었는지 확인

### 포트 충돌 오류
8181 포트가 사용 중이라면 config/application.properties에서 server.port를 변경하세요.

### 이미지 업로드 오류
이미지 업로드가 실패한다면:
1. uploads 폴더에 쓰기 권한이 있는지 확인
2. 파일 크기가 10MB 이하인지 확인
3. 지원되는 이미지 형식인지 확인 (PNG, JPG, GIF 등)

## 버전 정보
- 버전: v1.1.0
- 빌드 날짜: 2025-06-07
- 이미지 붙여넣기 자동 업로드 기능 추가 