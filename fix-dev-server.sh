#!/bin/bash
# 개발 서버 재시작 스크립트

echo "🔍 실행 중인 프로세스 정리..."

# cargo와 관련된 모든 프로세스 종료
pkill -f "cargo watch" 2>/dev/null
pkill -f "cargo run" 2>/dev/null
pkill -f "server" | grep -v "language_server" 2>/dev/null

# node 프로세스들도 정리
pkill -f "vite" 2>/dev/null
pkill -f "concurrently" 2>/dev/null

sleep 2

echo "🧹 빌드 캐시 정리 중..."

# 증분 컴파일 캐시 정리 (선택적)
# rm -rf target/debug/incremental

echo "✨ 프로세스 정리 완료!"
echo ""
echo "이제 'pnpm run dev'로 서버를 시작하세요."
