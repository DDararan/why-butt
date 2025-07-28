@echo off
chcp 65001 > nul
echo.
echo ====================================
echo  와이벗 실행 기동프로세스 시작
echo ====================================
echo.

echo.
echo ====================================
echo   서버 설정
echo ====================================
echo.

REM 서버 IP 설정
set /p SERVER_IP=서버 IP 주소를 입력하세요 (예: 192.168.0.100 또는 localhost): 
if "%SERVER_IP%"=="" set SERVER_IP=localhost

set APP_SERVER_HOST=http://%SERVER_IP%:8181
set APP_CORS_ORIGINS=http://localhost:3000,http://localhost:8181,http://%SERVER_IP%:3000,http://%SERVER_IP%:8181

echo.
echo ✅ 빌드 완료! Orange Wiki를 시작합니다...
echo 📍 서버 주소: %APP_SERVER_HOST%
echo 📍 브라우저에서 %APP_SERVER_HOST% 를 열어주세요
echo.
echo ⚠️  종료하려면 Ctrl+C를 누르세요
echo.

:: Orange Wiki 시스템 실행 (동적 설정 적용)
java -jar target\orange-wiki-1.0.0-SNAPSHOT.jar ^
    -Dapp.server.host=%APP_SERVER_HOST% ^
    -Dapp.cors.allowed-origins=%APP_CORS_ORIGINS% ^
    -Dserver.port=8181

echo.
echo 📄 Orange Wiki가 종료되었습니다.
pause 