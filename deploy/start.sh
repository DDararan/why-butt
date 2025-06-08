#!/bin/bash
echo "==============================================="
echo " WHY-BUTT (와이벗) 위키 시스템 시작"
echo "==============================================="
echo

cd "$(dirname "$0")"

mkdir -p data
mkdir -p logs
mkdir -p uploads

echo "서버를 시작합니다..."
echo "포트: 8181"
echo

java -jar -Dspring.config.location=config/application.properties bin/WHY-BUTT.jar 