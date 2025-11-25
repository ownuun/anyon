# Tauri Desktop Setup Guide

## Overview

Anyon MVP를 Tauri 기반 데스크톱 애플리케이션으로 실행할 수 있도록 구성되었습니다.

## Architecture

### Sidecar Pattern
- **Tauri Shell**: 네이티브 데스크톱 래퍼
- **anyon-core**: 기존 Rust 백엔드를 sidecar 프로세스로 실행
- **React Frontend**: WebView에서 실행

```
┌─────────────────────────────────────┐
│         Tauri Process               │
│  ┌───────────────────────────────┐  │
│  │  main.rs (Tauri Entry)       │  │
│  │  - Sidecar Manager            │  │
│  │  - Keychain Commands          │  │
│  │  - Update Service             │  │
│  └───────────────────────────────┘  │
│           │                          │
│           ├─ spawn ──> anyon-core    │
│           │            (sidecar)     │
│           │            :PORT         │
│  ┌───────────────────────────────┐  │
│  │  WebView (React App)         │  │
│  │  - API calls to sidecar      │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

## Prerequisites

### System Dependencies (Linux/WSL)

```bash
# Ubuntu/Debian
sudo apt-get update && sudo apt-get install -y \
  libwebkit2gtk-4.1-dev \
  libgtk-3-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev

# Fedora
sudo dnf install webkit2gtk4.1-devel gtk3-devel libappindicator-gtk3-devel librsvg2-devel

# Arch
sudo pacman -S webkit2gtk-4.1 gtk3 libappindicator-gtk3 librsvg
```

### Development Tools

- Rust (stable)
- Node.js 18+
- pnpm 8+
- Tauri CLI (자동 설치됨)

## Project Structure

```
anyon-mvp/
├── src-tauri/                    # Tauri 앱
│   ├── Cargo.toml               # Tauri 프로젝트 설정
│   ├── tauri.conf.json          # Tauri 설정
│   ├── capabilities/
│   │   └── default.json         # 권한 설정
│   ├── icons/                   # 앱 아이콘
│   └── src/
│       ├── main.rs              # 진입점
│       ├── lib.rs               # 라이브러리
│       └── sidecar.rs           # Sidecar 관리
├── scripts/
│   └── build-sidecar.sh         # Sidecar 빌드 스크립트
└── frontend/
    └── src/
        └── lib/
            ├── tauri.ts         # Tauri 유틸리티
            └── api.ts           # API 클라이언트 (Tauri 지원)
```

## Development

### 1. Sidecar 빌드

```bash
# 디버그 모드
pnpm run sidecar:build

# 릴리즈 모드
pnpm run sidecar:build:release
```

이 명령은:
- `anyon-core` 서버를 빌드
- 빌드된 바이너리를 `src-tauri/binaries/anyon-core-{target}`로 복사
- Tauri가 sidecar로 인식할 수 있도록 플랫폼별 이름 지정

### 2. 개발 모드 실행

```bash
pnpm run tauri:dev
```

실행 순서:
1. Sidecar 빌드 (`beforeDevCommand`)
2. Frontend 개발 서버 시작 (포트 3000)
3. Tauri 앱 실행
4. Sidecar 자동 시작 및 포트 감지

### 3. 프로덕션 빌드

```bash
pnpm run tauri:build
```

생성되는 파일:
- **Linux**: `src-tauri/target/release/bundle/appimage/anyon_0.1.0_amd64.AppImage`
- **macOS**: `src-tauri/target/release/bundle/dmg/Anyon_0.1.0_*.dmg`
- **Windows**: `src-tauri/target/release/bundle/nsis/Anyon_0.1.0_x64-setup.exe`

## How It Works

### 1. Sidecar 시작

`src-tauri/src/lib.rs`:
```rust
.setup(|app| {
    let handle = app.handle().clone();

    tauri::async_runtime::spawn(async move {
        match sidecar::start_sidecar(&handle).await {
            Ok(port) => {
                tracing::info!("Sidecar started on port {}", port);
            }
            Err(e) => {
                tracing::error!("Failed to start sidecar: {}", e);
            }
        }
    });

    Ok(())
})
```

### 2. 포트 감지

Sidecar는 stdout에 다음과 같이 포트를 출력합니다:
```
Server running on http://127.0.0.1:12345
```

Tauri는 이 출력을 파싱하여 포트 번호를 추출합니다.

### 3. Frontend API 연동

`frontend/src/lib/api.ts`:
```typescript
// 앱 시작 시 API base URL 초기화
export const initApiBaseUrl = async (): Promise<void> => {
  if (!isTauri()) {
    return; // 브라우저 모드는 상대 URL 사용
  }

  // Sidecar 포트 대기
  const port = await getSidecarPort();
  apiBaseUrl = `http://localhost:${port}`;
};
```

### 4. API 요청

모든 API 요청은 자동으로 sidecar URL을 사용합니다:

```typescript
// 브라우저 모드: /api/projects (Vite proxy)
// Tauri 모드: http://localhost:12345/api/projects
const projects = await projectsApi.getAll();
```

## Configuration

### Tauri Config (`src-tauri/tauri.conf.json`)

주요 설정:
- `identifier`: `ai.anyon.desktop`
- `productName`: `Anyon`
- `version`: `0.1.0`
- `externalBin`: Sidecar 바이너리 경로
- `plugins.shell.sidecar`: Sidecar 활성화

### Security

CSP 설정:
```json
{
  "app": {
    "security": {
      "csp": "default-src 'self'; connect-src 'self' http://localhost:* https://api.github.com"
    }
  }
}
```

## Troubleshooting

### Sidecar가 시작되지 않음

1. 빌드 확인:
   ```bash
   pnpm run sidecar:build
   ls -la src-tauri/binaries/
   ```

2. 로그 확인:
   - Linux: `~/.local/share/ai.anyon.desktop/logs/`
   - macOS: `~/Library/Logs/ai.anyon.desktop/`
   - Windows: `%APPDATA%\ai.anyon.desktop\logs\`

3. 수동 실행 테스트:
   ```bash
   ./src-tauri/binaries/anyon-core-x86_64-unknown-linux-gnu
   ```

### Frontend가 sidecar에 연결되지 않음

1. 브라우저 콘솔 확인:
   ```
   [Tauri] API base URL set to: http://localhost:12345
   ```

2. 포트 확인:
   ```javascript
   // 개발자 도구 콘솔
   window.__TAURI__.invoke('get_sidecar_port')
   ```

### GTK 에러 (Linux)

```bash
# 의존성 재설치
sudo apt-get install --reinstall libwebkit2gtk-4.1-dev libgtk-3-dev
```

## Next Steps (Sprint 2+)

### Sprint 2: Keychain 통합
- [ ] `keyring-rs` 통합
- [ ] Keychain IPC 커맨드
- [ ] Frontend Keychain 유틸리티
- [ ] `credentials.json` 마이그레이션

### Sprint 3: 업데이트 + 인스톨러
- [ ] 업데이트 서명 키 생성
- [ ] Updater 플러그인 설정
- [ ] 업데이트 UI
- [ ] 플랫폼별 인스톨러

### Sprint 4: CI/CD + 코드 서명
- [ ] GitHub Actions 워크플로우
- [ ] macOS Developer ID
- [ ] Windows EV Certificate

### Sprint 5: Growth
- [ ] 시스템 트레이
- [ ] 자동 시작

## Resources

- [Tauri Documentation](https://tauri.app/v2/)
- [Tauri Sidecar Guide](https://tauri.app/v2/guides/building/sidecar)
- [Sprint Plan](./sprint-plan.md)
- [Architecture](./architecture.md)
