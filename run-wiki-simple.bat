@echo off
chcp 65001 > nul
echo.
echo ====================================
echo   🤔 WHY-BUTT (와이벗) 바로 실행
echo ====================================
echo.

echo ✅ 이미 빌드된 JAR 파일을 실행합니다...
echo 📍 브라우저에서 http://localhost:8181 을 열어주세요
echo.
echo ⚠️  종료하려면 Ctrl+C를 누르세요
echo.

:: 위키 시스템 실행 (빌드 과정 생략)
java -jar target\orange-wiki-1.0.0-SNAPSHOT.jar

echo.
echo 📄 WHY-BUTT (와이벗)이 종료되었습니다.
pause 