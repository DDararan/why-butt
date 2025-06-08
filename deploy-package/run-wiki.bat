@echo off
chcp 65001 > nul
echo.
echo ====================================
echo   🍊 위키 시스템 v1.0 시작
echo ====================================
echo.

:: Java 설치 확인
java -version > nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Java가 설치되지 않았습니다.
    echo    Java 17 이상을 설치해주세요: https://adoptium.net/
    echo.
    pause
    exit /b 1
)

:: JAR 파일 확인
if not exist "orange-wiki-1.0.0-SNAPSHOT.jar" (
    echo ❌ JAR 파일이 없습니다. 
    echo    orange-wiki-1.0.0-SNAPSHOT.jar 파일이 같은 폴더에 있는지 확인해주세요.
    echo.
    pause
    exit /b 1
)

echo ✅ 위키 시스템을 시작합니다...
echo 📍 브라우저에서 http://localhost:8181 을 열어주세요
echo.
echo ⚠️  종료하려면 Ctrl+C를 누르세요
echo.

:: 위키 시스템 실행
java -jar orange-wiki-1.0.0-SNAPSHOT.jar

echo.
echo 📄 위키 시스템이 종료되었습니다.
pause 