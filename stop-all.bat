@echo off
echo ====================================
echo TTT Wiki 서버 종료
echo ====================================
echo.

echo Hocuspocus 서버 종료 중...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :1234') do (
    taskkill /PID %%a /F 2>nul
)

echo React 개발 서버 종료 중...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
    taskkill /PID %%a /F 2>nul
)

echo Spring Boot 서버 종료 중...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8181') do (
    taskkill /PID %%a /F 2>nul
)

echo.
echo 모든 서버가 종료되었습니다.
pause