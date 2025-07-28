@echo off
chcp 65001 > nul
echo ========================================
echo TTT Wiki 전체 서버 시작
echo ========================================
echo.

REM 백엔드 서버 시작
echo [1/3] Spring Boot 백엔드 서버 시작 중...
start "TTT Backend" cmd /k "mvnw spring-boot:run"

REM 잠시 대기
timeout /t 5 /nobreak > nul

REM Hocuspocus 협업 서버 시작
echo [2/3] Hocuspocus 협업 서버 시작 중...
cd frontend
start "Hocuspocus Server" cmd /k "npm run hocuspocus"

REM 잠시 대기
timeout /t 3 /nobreak > nul

REM 프론트엔드 개발 서버 시작
echo [3/3] React 프론트엔드 서버 시작 중...
start "TTT Frontend" cmd /k "npm start"

echo.
echo ========================================
echo 모든 서버가 시작되었습니다!
echo ========================================
echo.
echo 접속 주소:
echo - 프론트엔드: http://localhost:3000
echo - 백엔드 API: http://localhost:8181
echo - 협업 서버: ws://localhost:1234
echo.
echo 종료하려면 각 창을 닫거나 Ctrl+C를 누르세요.
echo ========================================

pause