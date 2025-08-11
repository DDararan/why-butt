@echo off
chcp 65001 > nul
echo ========================================
echo TTT Wiki JAR 실행 (메모리 설정 포함)
echo ========================================
echo.
echo JVM 메모리 설정:
echo - 초기 힙 메모리 (Xms): 512MB
echo - 최대 힙 메모리 (Xmx): 2048MB (2GB)
echo.
echo 실행 중...
java -Xms512m -Xmx2048m -jar why-butt-1.0.0-SNAPSHOT.jar

pause