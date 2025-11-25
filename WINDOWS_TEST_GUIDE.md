# Windows 테스트 가이드

## 🎯 Windows에서 Tauri 앱 테스트하기

### 사전 준비 (Windows에서)

1. **필수 도구 설치**
   - Node.js 18+ (https://nodejs.org)
   - pnpm: `npm install -g pnpm`
   - Rust: https://rustup.rs/
   - Visual Studio Build Tools (Rust 설치 시 자동 안내됨)

2. **WebView2 설치** (보통 이미 설치되어 있음)
   - Windows 11: 기본 설치됨
   - Windows 10: Microsoft Edge가 설치되어 있으면 OK
   - 없으면: https://developer.microsoft.com/microsoft-edge/webview2/

### 빠른 테스트 방법

#### 옵션 1: 개발 모드 실행 (추천)
```powershell
# 1. 프로젝트 디렉토리로 이동
cd anyon-mvp

# 2. 의존성 설치 (처음 한 번만)
pnpm install

# 3. Tauri 개발 모드 실행
pnpm run tauri:dev
```

이 명령은:
- ✅ Sidecar 자동 빌드
- ✅ Frontend 개발 서버 시작
- ✅ Tauri 앱 창 열기
- ✅ Hot reload 지원

**예상 시간**: 첫 실행 5-10분 (컴파일), 이후 1-2분

#### 옵션 2: 프로덕션 빌드
```powershell
# 완전한 릴리즈 빌드 (오래 걸림: 15-30분)
pnpm run tauri:build

# 빌드 결과 위치:
# src-tauri/target/release/bundle/msi/Anyon_0.1.0_x64_en-US.msi
# src-tauri/target/release/bundle/nsis/Anyon_0.1.0_x64-setup.exe
```

### 테스트 체크리스트

#### 기본 실행
- [ ] 앱 창이 열리는지
- [ ] Frontend UI가 제대로 표시되는지
- [ ] Console에 에러가 없는지

#### Sidecar 연동
- [ ] 백엔드 서버가 자동 시작되는지
- [ ] Frontend가 API와 통신하는지
- [ ] 로그에 포트 번호가 표시되는지

#### Keychain
- [ ] 앱 시작 시 credentials.json 마이그레이션 확인
- [ ] OAuth 로그인 시 Keychain에 저장되는지
- [ ] 앱 재시작 후 로그인 유지되는지

#### 시스템 트레이
- [ ] 트레이 아이콘이 표시되는지
- [ ] 트레이 메뉴가 동작하는지 (Show/Hide/Quit)
- [ ] 트레이 아이콘 클릭으로 창 토글되는지
- [ ] 창 닫기 시 트레이로 최소화되는지

#### 업데이트 (추후 테스트)
- [ ] 업데이트 체크 기능
- [ ] 업데이트 다운로드/설치

### 로그 확인

#### 개발 모드
- Frontend: 브라우저 DevTools (F12)
- Backend: 터미널 출력
- Tauri: 터미널 출력

#### 프로덕션 빌드
Windows 로그 위치:
```
%APPDATA%\ai.anyon.desktop\logs\
```

### 문제 해결

#### "Sidecar not found" 에러
```powershell
# Sidecar 수동 빌드
pnpm run sidecar:build

# 파일 확인
ls src-tauri/binaries/
# anyon-core-x86_64-pc-windows-msvc.exe 있어야 함
```

#### "Failed to start sidecar" 에러
```powershell
# Sidecar 직접 실행 테스트
.\src-tauri\binaries\anyon-core-x86_64-pc-windows-msvc.exe

# 포트 확인
netstat -ano | findstr :12345
```

#### WebView2 에러
```powershell
# WebView2 Runtime 다운로드
# https://developer.microsoft.com/microsoft-edge/webview2/
```

#### 빌드 에러
```powershell
# Rust 업데이트
rustup update stable

# Tauri CLI 재설치
cargo install tauri-cli --version "^2" --force

# 캐시 삭제 후 재시도
cargo clean
pnpm run tauri:dev
```

### 성능 확인

#### 앱 크기
```powershell
# 설치 파일 크기 확인
ls -l src-tauri/target/release/bundle/nsis/*.exe
ls -l src-tauri/target/release/bundle/msi/*.msi

# 예상: 80-120MB
```

#### 메모리 사용량
- Task Manager에서 확인
- 예상: 100-200MB (sidecar 포함)

#### 시작 시간
- 앱 아이콘 클릭 → 창 표시
- 예상: 2-3초

### 스크린샷 / 동영상 캡처

테스트 결과 기록:
1. 앱 실행 화면
2. 시스템 트레이 메뉴
3. 주요 기능 동작
4. 에러 발생 시 스크린샷

### 다음 단계

테스트 후:
1. ✅ 동작하면: GitHub에 커밋하고 첫 릴리즈 준비
2. ⚠️ 문제 발견: 에러 로그와 함께 이슈 생성
3. 📝 피드백: 개선사항 정리

## 🔑 중요 정보

### 서명 키
- 위치: `keys/updater.key`
- 비밀번호: `anyon-desktop-2025`
- **중요**: Private key는 절대 공유하지 마세요!

### GitHub Secrets (나중에 설정)
릴리즈 자동화를 위해:
1. GitHub → Settings → Secrets → Actions
2. 추가할 시크릿:
   - `TAURI_SIGNING_PRIVATE_KEY`: keys/updater.key 내용
   - `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`: anyon-desktop-2025

### 첫 릴리즈 생성
```bash
# WSL/Linux/macOS에서
git tag v0.1.0
git push origin v0.1.0

# GitHub Actions가 자동으로 빌드하고 릴리즈 생성
```

## 📚 참고 문서

- [TAURI_QUICKSTART.md](./TAURI_QUICKSTART.md) - 빠른 시작
- [DESKTOP_APP_COMPLETE.md](./DESKTOP_APP_COMPLETE.md) - 완료 보고서
- [docs/tauri-setup.md](./docs/tauri-setup.md) - 상세 가이드
- [keys/SIGNING_KEY_INFO.md](./keys/SIGNING_KEY_INFO.md) - 서명 키 정보

## ⚡ 팁

### 빠른 재빌드
```powershell
# Frontend만 변경 시
pnpm run frontend:build

# Backend만 변경 시
pnpm run sidecar:build

# Tauri 앱만 재빌드
cargo tauri build --no-bundle
```

### 로그 레벨 조정
```powershell
# 상세 로그
$env:RUST_LOG="debug"
pnpm run tauri:dev
```

---

**행운을 빕니다!** 🚀

문제가 있으면 에러 메시지와 함께 이슈를 생성해주세요.
