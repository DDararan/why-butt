🤔 WHY-BUTT (와이벗) 실행 가이드
=====================================
What have you been up to today?

📋 필요 조건
-----------
- Java 17 이상 설치 필요
- 브라우저 (Chrome, Firefox, Edge 등)

📦 포함된 파일들
--------------
- orange-wiki-1.0.0-SNAPSHOT.jar  : 메인 실행 파일 (62MB)
- run-wiki-simple.bat             : 간편 실행 스크립트
- wikidb.mv.db                    : 데이터베이스 파일 (기존 데이터)
- uploads/                        : 파일 업로드 저장 폴더
- README-실행가이드.txt            : 이 파일

🚀 실행 방법
-----------
방법 1: 배치 파일 사용 (권장)
   run-wiki-simple.bat 더블클릭

방법 2: 명령어 직접 실행
   cmd 창에서: java -jar orange-wiki-1.0.0-SNAPSHOT.jar

📱 접속 방법
-----------
브라우저에서 http://localhost:8181 접속

⚠️ 주의사항
-----------
- 종료: Ctrl+C 또는 터미널 창 닫기
- 방화벽 경고 시 '액세스 허용' 선택
- 포트 8181이 사용 중이면 다른 프로그램 종료 후 재시도

✨ 새로운 기능들
--------------
- 페이지 타입 계층 구조 (상위 페이지 타입 자동 상속)
- 페이지 작성 시 제목 자동 포커스
- 컴팩트한 마크다운 툴바 (1줄로 정리)

🛠️ 문제 해결
-----------
- Java 없음: Oracle JDK 17+ 또는 OpenJDK 17+ 설치
- 실행 안됨: 명령 프롬프트에서 'java -version' 확인
- 접속 안됨: http://localhost:8181 정확히 입력

📞 지원
------
프로그램 시작 시 콘솔에 나타나는 로그 확인 