#!/bin/bash

echo "===================================="
echo "TTT Wiki 서버 종료"
echo "===================================="
echo ""

echo "Hocuspocus 서버 종료 중..."
kill -9 $(lsof -t -i:1234) 2>/dev/null || echo "Hocuspocus 서버가 실행 중이 아닙니다."

echo "React 개발 서버 종료 중..."
kill -9 $(lsof -t -i:3000) 2>/dev/null || echo "React 서버가 실행 중이 아닙니다."

echo "Spring Boot 서버 종료 중..."
kill -9 $(lsof -t -i:8181) 2>/dev/null || echo "Spring Boot 서버가 실행 중이 아닙니다."

echo ""
echo "모든 서버가 종료되었습니다."