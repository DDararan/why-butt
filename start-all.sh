#!/bin/bash

echo "===================================="
echo "TTT Wiki 동시편집 시스템 시작"
echo "===================================="
echo ""

# Backend 서버 시작 (백그라운드)
echo "[1/3] Spring Boot 백엔드 서버 시작..."
./mvnw spring-boot:run &
BACKEND_PID=$!

# 3초 대기
sleep 3

# Frontend 디렉토리로 이동
cd frontend

# Hocuspocus 서버 시작 (백그라운드)
echo "[2/3] Hocuspocus WebSocket 서버 시작..."
npm run hocuspocus &
HOCUSPOCUS_PID=$!

# 3초 대기
sleep 3

# React 개발 서버 시작
echo "[3/3] React 프론트엔드 서버 시작..."
npm start &
FRONTEND_PID=$!

echo ""
echo "===================================="
echo "모든 서버가 시작되었습니다!"
echo ""
echo "- Backend API: http://localhost:8181"
echo "- WebSocket: ws://localhost:1234"
echo "- Frontend: http://localhost:3000"
echo ""
echo "브라우저에서 http://localhost:3000 접속"
echo "===================================="
echo ""
echo "종료하려면 Ctrl+C를 누르세요"

# 프로세스 종료 처리
trap 'kill $BACKEND_PID $HOCUSPOCUS_PID $FRONTEND_PID' EXIT

# 대기
wait