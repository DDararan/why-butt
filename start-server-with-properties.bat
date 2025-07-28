@echo off
setlocal enabledelayedexpansion

echo Wiki 서버를 시작합니다...

REM Java가 설치되어 있는지 확인
java -version >nul 2>&1
if errorlevel 1 (
    echo Java가 설치되어 있지 않습니다. Java를 설치해주세요.
    pause
    exit /b 1
)

REM JAR 파일이 있는지 확인
if not exist "wiki-0.0.1-SNAPSHOT.jar" (
    echo JAR 파일을 찾을 수 없습니다.
    echo 프로젝트를 빌드해주세요.
    pause
    exit /b 1
)

REM application.properties 파일이 있는지 확인
if not exist "src\main\resources\application.properties" (
    echo application.properties 파일을 찾을 수 없습니다.
    pause
    exit /b 1
)

REM 서버 IP 설정
set /p SERVER_IP=서버 IP 주소를 입력하세요 (예: 192.168.0.100): 
set APP_SERVER_HOST=http://%SERVER_IP%:8181

REM application.properties 파일 읽기
echo application.properties 파일을 읽는 중...
for /f "tokens=1,2 delims==" %%a in ('type "src\main\resources\application.properties"') do (
    set "%%a=%%b"
)

REM 서버 포트 설정
set SERVER_PORT=8181
for /f "tokens=1,2 delims==" %%a in ('type "src\main\resources\application.properties" ^| findstr "server.port"') do (
    set "SERVER_PORT=%%b"
)

REM 파일 업로드 크기 제한 설정
set MAX_FILE_SIZE=1GB
for /f "tokens=1,2 delims==" %%a in ('type "src\main\resources\application.properties" ^| findstr "spring.servlet.multipart.max-file-size"') do (
    set "MAX_FILE_SIZE=%%b"
)

echo.
echo 서버 설정 정보:
echo -------------------------
echo 서버 주소: %APP_SERVER_HOST%
echo 서버 포트: %SERVER_PORT%
echo 파일 업로드 제한: %MAX_FILE_SIZE%
echo -------------------------
echo.

REM 서버 시작
echo 서버를 시작합니다...
java -jar wiki-0.0.1-SNAPSHOT.jar --spring.config.location=src/main/resources/application.properties

pause 