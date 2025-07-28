# TTT Wiki 로컬 협업 편집 시스템 가이드

## 🚀 Yjs 기반 로컬 편집 시스템

TTT Wiki는 **Yjs CRDT** 기반의 로컬 편집 시스템을 제공합니다.

### 🎯 주요 특징

#### 1. 자동 충돌 해결
- **CRDT (Conflict-free Replicated Data Types)** 사용
- 복잡한 OT 변환 로직 불필요
- 로컬 환경에서 안정적인 편집

#### 2. 한글 IME 완전 지원
- 한글 조합 문자 자동 처리
- IME 입력 중 끊김 현상 해결
- 자연스러운 한글 입력 경험

#### 3. 로컬 저장소 지원
- IndexedDB를 통한 로컬 데이터 관리
- 브라우저 캐시 기반 데이터 보존
- 오프라인 편집 지원

## 🛠 기술 아키텍처

### 시스템 구성
```
┌─────────────────────┐
│  React Frontend     │
│  - Yjs Document     │
│  - TipTap Editor    │
│  - IndexedDB        │
│                     │
└─────────────────────┘
         │ HTTP API
         ▼
┌─────────────────────┐
│  Spring Boot        │
│  - REST API         │
│  - 인증 관리        │
│  - 파일 업로드      │
│                     │
└─────────────────────┘
         │ HTTP API
         ▼
┌─────────────────────┐
│  H2 Database        │
│  - 콘텐츠 저장      │
│  - 메타데이터       │
│                     │
└─────────────────────┘
```

### 핵심 컴포넌트

#### 1. Yjs Document
- **역할**: 문서 상태 관리
- **특징**: CRDT 기반 자동 충돌 해결
- **저장**: IndexedDB (로컬) + H2 Database (백엔드)

#### 2. TipTap Editor
- **역할**: WYSIWYG 에디터
- **확장**: Collaboration 확장 사용
- **통합**: Yjs Document와 완전 통합

#### 3. IndexedDB 영속성
- **역할**: 로컬 브라우저 데이터 저장
- **특징**: 오프라인 지원 및 빠른 접근
- **동기화**: 백엔드와 자동 동기화

## 📦 설치 및 실행

### 1. 의존성 설치
```bash
# 프론트엔드 Yjs 라이브러리
cd frontend
npm install
# 필요한 패키지: yjs, @tiptap/extension-collaboration, y-indexeddb
```

### 2. 실행 방법

```bash
# 1. 백엔드 실행
./mvnw spring-boot:run

# 2. 프론트엔드 실행 (별도 터미널)
cd frontend && npm start
```

### 3. 서비스 확인
- **프론트엔드**: http://localhost:3000
- **백엔드**: http://localhost:8181

## 🔧 구성 요소 상세

### 프론트엔드 (React)

#### YjsEditor 컴포넌트
```typescript
// Yjs Document 초기화
const ydoc = new Y.Doc();

// 로컬 영속성 (오프라인 지원)
const localProvider = new IndexeddbPersistence(documentName, ydoc);

// TipTap 협업 확장
const extensions = [
  StarterKit.configure({
    codeBlock: false,
    history: false, // Yjs가 히스토리 관리
  }),
  Collaboration.configure({
    document: ydoc,
  }),
  // 기타 확장들...
];

// 에디터 초기화
const editor = useEditor({
  extensions,
  content: defaultValue,
  editable: !readOnly,
  onCreate: ({ editor }) => {
    setEditorReady(true);
  },
});
```

### 백엔드 (Java Spring Boot)

#### 주요 특징
1. **WikiPage 엔터티**: 기존 HTML 콘텐츠 저장
2. **WikiPageDto**: 표준 DTO 구조 유지
3. **REST API**: 기존 API 호환성 유지
4. **H2 Database**: 메타데이터 및 콘텐츠 저장

```java
@Entity
public class WikiPage {
    @Column(columnDefinition = "TEXT")
    private String content; // HTML 콘텐츠 저장
    
    // 기타 필드들...
}
```

## 🔍 개발 및 디버깅

### 로그 모니터링
```bash
# 백엔드 로그
./mvnw spring-boot:run

# 프론트엔드 개발 서버
cd frontend && npm start

# 브라우저 콘솔에서 Yjs 상태 확인
console.log(ydoc.getMap('document').toJSON());

# IndexedDB 상태 확인 (개발자 도구 > Application > Storage)
```

### 트러블슈팅

#### 1. 편집기 로딩 문제
- 브라우저 콘솔에서 에러 메시지 확인
- Yjs Document 초기화 상태 확인
- IndexedDB 접근 권한 확인

#### 2. 데이터 동기화 문제
- 네트워크 연결 상태 확인
- 백엔드 API 호출 상태 확인
- IndexedDB 데이터 상태 확인

#### 3. 한글 입력 문제
- IME 조합 상태 확인
- TipTap 확장 설정 확인
- 브라우저 호환성 확인

## 🚀 성능 최적화

### 저장 최적화
- **디바운스**: 자동 저장 로직
- **로컬 우선**: IndexedDB 기반 빠른 접근
- **중복 방지**: 변경사항 감지 후에만 저장

### 메모리 관리
```typescript
// Provider 생명주기 관리
useEffect(() => {
  return () => {
    if (localProviderRef.current) {
      localProviderRef.current.destroy();
    }
    if (ydocRef.current) {
      ydocRef.current.destroy();
    }
  };
}, []);
```

### IndexedDB 최적화
- **문서별 분리**: 각 페이지별 독립적인 저장
- **자동 정리**: 불필요한 데이터 자동 정리
- **압축**: 브라우저 자체 압축 기능 활용

## 🔄 마이그레이션 가이드

### 기존 OT 시스템에서 전환

#### 1. 데이터 호환성
- **기존 HTML 콘텐츠**: 자동으로 Yjs 형식으로 변환
- **데이터베이스 스키마**: 기존 구조 유지
- **API 호환성**: 기존 REST API 완전 호환

#### 2. 컴포넌트 교체
```typescript
// 기존
import Editor from '../components/Editor';
<Editor pageId={pageId} enableCollaboration={true} />

// 새로운
import YjsEditor from '../components/YjsEditor';
<YjsEditor pageId={pageId} currentUser={currentUser} />
```

#### 3. 서비스 변경
- **collaborativeEditingService**: 더 이상 사용하지 않음
- **operationalTransform**: Yjs가 자동 처리
- **외부 서버**: 불필요 (로컬 전용)

### 완료된 마이그레이션
1. ✅ **Yjs 기반 편집기 구현**
2. ✅ **로컬 IndexedDB 통합**
3. ✅ **기존 컴포넌트 교체**
4. ✅ **외부 서버 의존성 제거**

## 📊 모니터링 및 관리

### 상태 모니터링
```bash
# 백엔드 상태 확인
curl http://localhost:8181/health

# 프론트엔드 개발 서버
curl http://localhost:3000

# 브라우저에서 IndexedDB 상태 확인
# 개발자 도구 > Application > Storage > IndexedDB
```

### 백업 및 복원
- **HTML 콘텐츠**: 데이터베이스에 저장
- **IndexedDB**: 클라이언트 로컬 백업
- **브라우저 캐시**: 오프라인 지원

## 🎯 향후 계획

### 단기 목표
- [ ] 편집 히스토리 개선
- [ ] 오프라인 동기화 강화
- [ ] 성능 최적화

### 중기 목표
- [ ] 모바일 지원
- [ ] 고급 편집 기능
- [ ] 검색 성능 개선

### 장기 목표
- [ ] 실시간 협업 서버 (선택적)
- [ ] AI 기반 편집 도구
- [ ] 클라우드 동기화

## 🤝 기여하기

### 개발 환경 설정
```bash
# 저장소 클론
git clone https://github.com/your-repo/ttt-wiki.git

# 의존성 설치
cd ttt-wiki
cd frontend && npm install
```

### 기여 가이드
1. **이슈 보고**: GitHub Issues 사용
2. **기능 제안**: Discussion 페이지 활용
3. **코드 기여**: Pull Request 제출
4. **문서 개선**: README/COLLABORATION.md 업데이트

## 📝 라이선스

MIT License - 자유롭게 사용, 수정, 배포 가능합니다.

---

**문의사항이나 지원이 필요하시면 GitHub Issues를 통해 연락주세요.**