@echo off
echo ====================================
echo TTT Wiki 동시편집 시스템 시작
echo ====================================
echo.

REM Backend 서버 시작 (별도 창)
echo [1/3] Spring Boot 백엔드 서버 시작...
start "TTT Backend" cmd /k "mvnw spring-boot:run"

REM 3초 대기
timeout /t 3 /nobreak > nul

REM Frontend 디렉토리로 이동
cd frontend

REM Hocuspocus 서버 시작 (별도 창)
echo [2/3] Hocuspocus WebSocket 서버 시작...
start "Hocuspocus Server" cmd /k "npm run hocuspocus"

REM 3초 대기
timeout /t 3 /nobreak > nul

REM React 개발 서버 시작 (별도 창)
echo [3/3] React 프론트엔드 서버 시작...
start "React Frontend" cmd /k "npm start"

echo.
echo ====================================
echo 모든 서버가 시작되었습니다!
echo.
echo - Backend API: http://localhost:8181
echo - WebSocket: ws://localhost:1234
echo - Frontend: http://localhost:3000
echo.
echo 브라우저에서 http://localhost:3000 접속
echo ====================================
echo.
echo 이 창은 닫아도 됩니다.
pause