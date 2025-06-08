@echo off
chcp 65001 > nul
echo.
echo ====================================
echo   🤔 WHY-BUTT (와이벗) 자동 빌드 & 실행
echo ====================================
echo.

echo 📦 1단계: Maven 빌드 중...
call mvn clean package -DskipTests

if %errorlevel% neq 0 (
    echo ❌ 빌드가 실패했습니다.
    pause
    exit /b 1
)

echo.
echo ✅ 빌드 완료! WHY-BUTT (와이벗)을 시작합니다...
echo 📍 브라우저에서 http://localhost:8181 을 열어주세요
echo.
echo ⚠️  종료하려면 Ctrl+C를 누르세요
echo.

:: WHY-BUTT 시스템 실행
java -jar target\orange-wiki-1.0.0-SNAPSHOT.jar

echo.
echo 📄 WHY-BUTT (와이벗)이 종료되었습니다.
pause 