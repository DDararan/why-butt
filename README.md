# Orange Wiki

![Orange Wiki](https://img.shields.io/badge/Wiki-Orange%20Theme-orange)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.3.1-brightgreen)
![React](https://img.shields.io/badge/React-18.2.0-blue)
![Java](https://img.shields.io/badge/Java-24-red)
![JPackage](https://img.shields.io/badge/JPackage-Native-green)

**Orange Wiki** - Java 24 + JPackage 기반 네이티브 위키 시스템으로, 별도의 Java 설치 없이 독립 실행이 가능한 현대적인 위키 애플리케이션입니다.

## 📋 목차

- [프로젝트 개요](#프로젝트-개요)
- [주요 기능](#주요-기능)
- [기술 스택](#기술-스택)
- [시스템 아키텍처](#시스템-아키텍처)
- [설치 및 실행](#설치-및-실행)
- [API 문서](#api-문서)
- [프로젝트 구조](#프로젝트-구조)
- [개발 가이드](#개발-가이드)

## 🎯 프로젝트 개요

Orange Wiki는 Java 24의 JPackage 기능을 활용한 네이티브 위키 시스템입니다. 별도의 Java 설치 없이 독립 실행이 가능하며, 현대적인 오렌지 테마 UI와 강력한 편집 기능을 제공합니다.

### 핵심 가치
- **네이티브 패키징**: JPackage로 JRE 내장 독립 실행 파일 생성
- **최신 기술**: Java 24 + Spring Boot 3.3.1 기반
- **사용자 친화적**: 직관적인 오렌지 테마 UI
- **고성능**: 커스텀 JRE와 최적화된 JVM 설정
- **간편 배포**: 설치 없이 바로 실행 가능한 네이티브 패키지

## ✨ 주요 기능

### 📝 페이지 관리
- **계층적 페이지 구조**: 트리 형태의 페이지 조직화
- **실시간 편집기**: TipTap 기반 WYSIWYG 에디터
- **마크다운 지원**: Markdown 문법 완벽 지원
- **페이지 타입 관리**: MENU, DAILY, ETC 등 커스텀 타입
- **버전 관리**: 페이지 히스토리 및 복원 기능

### 📎 파일 관리
- **파일 첨부**: 페이지별 파일 업로드 및 관리
- **다운로드 지원**: 원본 파일 다운로드
- **이미지 미리보기**: 이미지 파일 인라인 표시
- **용량 제한**: 최대 1GB 파일 업로드 지원

### 💬 협업 기능
- **댓글 시스템**: 페이지별 댓글 및 답글
- **사용자 관리**: 로그인 및 권한 관리
- **히스토리 추적**: 모든 변경사항 기록 및 비교

### 📊 문서 내보내기
- **Word 문서**: .docx 형식 내보내기
- **Excel 문서**: .xlsx 형식 내보내기
- **메타데이터 포함**: 작성자, 날짜 등 정보 포함

### 🤖 AI 통합
- **로컬 LLM**: Ollama 연동 지원
- **문서 분석**: AI 기반 문서 요약 및 분석
- **스마트 검색**: AI 기반 검색 기능

## 🛠 기술 스택

### Backend
- **Framework**: Spring Boot 3.3.1
- **Language**: Java 24
- **Database**: H2 Database (파일 기반)
- **ORM**: Spring Data JPA + Hibernate
- **Build Tool**: Maven
- **Packaging**: JPackage + JLink
- **Documentation**: Apache POI (Word/Excel 생성)

### Frontend
- **Framework**: React 18.2.0
- **Language**: TypeScript
- **UI Library**: Material-UI (MUI)
- **Editor**: TipTap (WYSIWYG)
- **Markdown**: React Markdown
- **HTTP Client**: Axios
- **Build Tool**: Create React App

### 네이티브 패키징
- **JPackage**: 네이티브 실행 파일 생성
- **JLink**: 커스텀 JRE 생성
- **Module System**: Java 9+ 모듈 시스템
- **GraalVM**: 최적화된 성능 (선택사항)

### 개발 도구
- **IDE**: VS Code, IntelliJ IDEA
- **Version Control**: Git
- **Package Manager**: npm, Maven

## 🏗 시스템 아키텍처

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Frontend │◄──►│  Spring Backend │◄──►│   H2 Database   │
│   (Port: 3000)   │    │   (Port: 3001)  │    │   (File-based)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Static Files  │    │   File Storage  │    │   Upload Files  │
│   (React Build) │    │   (uploads/)    │    │   (페이지별)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                 │
                                 ▼
                    ┌─────────────────┐
                    │   JPackage      │
                    │   Native Bundle │
                    │   (JRE 내장)    │
                    └─────────────────┘
```

## 📦 설치 및 실행

### 방법 1: 네이티브 실행 파일 (권장)

#### 1. 필수 요구사항
- **Java 24** (빌드 시에만 필요)
- **Maven 3.8+**
- **Node.js 16+** (프론트엔드 빌드용)

#### 2. 프로젝트 클론 및 빌드
```bash
# 프로젝트 클론
git clone https://github.com/orange-wiki/orange-wiki.git
cd orange-wiki

# 통합 빌드 실행
./build-java24-jpackage.bat
```

#### 3. 네이티브 실행 파일 실행
```bash
# Windows
./target/dist/orange-wiki/orange-wiki.exe

# Linux/Mac
./target/dist/orange-wiki/orange-wiki
```

### 방법 2: Maven 명령어 직접 사용

```bash
# 1. 프론트엔드 빌드
cd frontend
npm install
npm run build
cd ..

# 2. 백엔드 빌드
mvn clean package -DskipTests

# 3. 커스텀 JRE 생성
mvn jlink:jlink

# 4. 네이티브 패키지 생성
mvn jpackage:jpackage
```

### 방법 3: JAR 파일 실행

```bash
# JAR 파일 직접 실행
java -jar target/orange-wiki-1.0.0-SNAPSHOT.jar
```

### 방법 4: 개발 서버 실행

```bash
# 백엔드 개발 서버
mvn spring-boot:run

# 프론트엔드 개발 서버 (별도 터미널)
cd frontend
npm start
```