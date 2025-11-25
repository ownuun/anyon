# Anyon Desktop Distribution - Architecture

## Executive Summary

기존 Anyon 웹앱(Rust 백엔드 + React 프론트엔드)을 Tauri 2.x로 래핑하여 네이티브 데스크톱 앱으로 배포한다. 핵심 아키텍처 결정은 **Sidecar 패턴** - Tauri 쉘이 기존 `anyon-core` 바이너리를 자식 프로세스로 관리하고, WebView가 localhost HTTP로 통신하는 구조다.

이 접근법은 기존 코드 변경을 최소화하면서 네이티브 데스크톱 기능(코드 서명, Keychain, 자동 업데이트)을 추가한다.

---

## Project Initialization

기존 프로젝트에 Tauri를 추가하는 방식:

```bash
# Tauri CLI 설치
cargo install tauri-cli

# 기존 프로젝트에 Tauri 초기화
cd anyon-mvp
cargo tauri init

# 필요한 플러그인 추가
cargo add tauri-plugin-shell tauri-plugin-updater tauri-plugin-notification
```

**첫 번째 구현 스토리:** Tauri 프로젝트 초기화 및 기본 설정

---

## Decision Summary

| Category | Decision | Version | Affects | Rationale |
|----------|----------|---------|---------|-----------|
| Desktop Framework | Tauri | 2.x (stable) | 전체 | Rust 기반, 경량, 보안 우수 |
| Sidecar Runtime | tauri-plugin-shell | 2.x | FR4, FR5 | 프로세스 생명주기 관리 |
| Auto-Update | tauri-plugin-updater | 2.x | FR7-12 | Ed25519 서명 검증 내장 |
| Keychain | keyring-rs | 3.x | FR13-18, NFR-S4 | 크로스플랫폼 OS Keychain |
| Notification | tauri-plugin-notification | 2.x | FR8, FR19-22 | 네이티브 알림 |
| Build Tool | tauri-cli | 2.x | CI/CD | 멀티플랫폼 빌드 |
| CI/CD | GitHub Actions | - | NFR-M1 | 무료, 통합 용이 |
| Code Signing (macOS) | Apple Developer ID | - | NFR-S1, S2 | Notarization 필수 |
| Code Signing (Windows) | EV Certificate | - | NFR-S1, S3 | SmartScreen 신뢰 |
| Update Server | GitHub Releases | - | FR7-12 | 무료, Tauri 기본 지원 |

---

## Project Structure

```
anyon-mvp/
├── .github/
│   └── workflows/
│       ├── build.yml              # PR 빌드 검증
│       ├── release.yml            # 릴리즈 자동화
│       └── sign.yml               # 코드 서명 (reusable)
│
├── crates/
│   ├── server/                    # 기존 anyon-core (변경 최소)
│   │   └── src/
│   │       └── main.rs
│   ├── db/                        # 기존 유지
│   ├── executors/                 # 기존 유지
│   ├── services/
│   │   └── src/
│   │       └── services/
│   │           └── auth/
│   │               └── keychain.rs  # NEW: Keychain 통합
│   └── ...
│
├── frontend/                      # 기존 React 앱 (변경 최소)
│   ├── src/
│   │   ├── lib/
│   │   │   └── tauri.ts           # NEW: Tauri IPC 유틸리티
│   │   └── ...
│   └── ...
│
├── src-tauri/                     # NEW: Tauri 앱
│   ├── Cargo.toml
│   ├── tauri.conf.json            # Tauri 설정
│   ├── capabilities/
│   │   └── default.json           # 권한 설정
│   ├── icons/                     # 앱 아이콘
│   │   ├── icon.icns              # macOS
│   │   ├── icon.ico               # Windows
│   │   └── icon.png               # Linux
│   ├── src/
│   │   ├── main.rs                # Tauri 진입점
│   │   ├── lib.rs                 # 라이브러리 모듈
│   │   ├── sidecar.rs             # Sidecar 프로세스 관리
│   │   ├── keychain.rs            # Keychain IPC 커맨드
│   │   ├── updater.rs             # 자동 업데이트 로직
│   │   └── tray.rs                # 시스템 트레이 (Growth)
│   └── resources/
│       └── sidecars/              # 플랫폼별 바이너리 (빌드 시 복사)
│
├── installer/                     # NEW: 인스톨러 설정
│   ├── macos/
│   │   ├── entitlements.plist     # macOS 권한
│   │   └── dmg-background.png     # DMG 배경
│   ├── windows/
│   │   └── installer.nsi          # NSIS 스크립트
│   └── linux/
│       └── appimage.yml           # AppImage 설정
│
├── Cargo.toml                     # 워크스페이스 (src-tauri 추가)
├── package.json
└── ...
```

---

## FR Category to Architecture Mapping

| FR Category | Architecture Component | 설명 |
|-------------|----------------------|------|
| Installation (FR1-6) | src-tauri/, installer/ | Tauri 빌드 + 인스톨러 |
| Auto-Update (FR7-12) | src-tauri/updater.rs | tauri-plugin-updater |
| Security (FR13-18) | src-tauri/keychain.rs, crates/services/auth | keyring-rs 통합 |
| System Tray (FR19-22) | src-tauri/tray.rs | tauri-plugin-notification |
| Preservation (FR23-26) | crates/*, frontend/ | 기존 코드 유지 |

---

## Technology Stack Details

### Core Technologies

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| Desktop Shell | Tauri | 2.x | 네이티브 앱 래퍼 |
| Backend | Rust (Axum) | 기존 | HTTP API 서버 |
| Frontend | React + TypeScript | 기존 | WebView 콘텐츠 |
| Database | SQLite (SQLx) | 기존 | 로컬 데이터 저장 |
| Keychain | keyring-rs | 3.x | OS 자격 증명 저장 |

### Tauri Plugins

| Plugin | Purpose | FR Coverage |
|--------|---------|-------------|
| tauri-plugin-shell | Sidecar 프로세스 관리 | FR4, FR5 |
| tauri-plugin-updater | 자동 업데이트 | FR7-12 |
| tauri-plugin-notification | 네이티브 알림 | FR8 |
| tauri-plugin-autostart | 시작 시 자동 실행 | Growth |

### Integration Points

```
┌─────────────────────────────────────────────────────────────┐
│                    Tauri Process                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    main.rs                          │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌────────────┐  │   │
│  │  │  Sidecar    │  │  Keychain   │  │  Updater   │  │   │
│  │  │  Manager    │  │  Commands   │  │  Service   │  │   │
│  │  └──────┬──────┘  └──────┬──────┘  └─────┬──────┘  │   │
│  └─────────┼────────────────┼───────────────┼─────────┘   │
│            │                │               │              │
│            │ spawn/kill     │ IPC           │ HTTP         │
│            ▼                ▼               ▼              │
│  ┌─────────────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │   anyon-core    │  │  WebView │  │  GitHub Releases │  │
│  │   (sidecar)     │◄─┤ (React)  │  │  (update server) │  │
│  │   :PORT         │  │          │  │                  │  │
│  └─────────────────┘  └──────────┘  └──────────────────┘  │
│            │                │                              │
│            └────────────────┘                              │
│              localhost HTTP                                │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Patterns

### Sidecar Process Management

```rust
// src-tauri/src/sidecar.rs

use tauri_plugin_shell::{ShellExt, process::CommandChild};
use std::sync::Mutex;

pub struct SidecarState {
    pub child: Mutex<Option<CommandChild>>,
    pub port: Mutex<Option<u16>>,
}

pub async fn start_sidecar(app: &tauri::AppHandle) -> Result<u16, String> {
    let sidecar = app.shell()
        .sidecar("anyon-core")
        .map_err(|e| e.to_string())?;

    let (mut rx, child) = sidecar.spawn()
        .map_err(|e| e.to_string())?;

    // stdout에서 포트 번호 파싱
    let port = parse_port_from_output(&mut rx).await?;

    // 상태 저장
    let state = app.state::<SidecarState>();
    *state.child.lock().unwrap() = Some(child);
    *state.port.lock().unwrap() = Some(port);

    Ok(port)
}

pub fn stop_sidecar(app: &tauri::AppHandle) -> Result<(), String> {
    let state = app.state::<SidecarState>();
    if let Some(child) = state.child.lock().unwrap().take() {
        child.kill().map_err(|e| e.to_string())?;
    }
    Ok(())
}
```

### Keychain Integration

```rust
// src-tauri/src/keychain.rs

use keyring::Entry;

const SERVICE_NAME: &str = "ai.anyon.desktop";

#[tauri::command]
pub fn save_token(key: &str, token: &str) -> Result<(), String> {
    let entry = Entry::new(SERVICE_NAME, key)
        .map_err(|e| e.to_string())?;
    entry.set_password(token)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_token(key: &str) -> Result<Option<String>, String> {
    let entry = Entry::new(SERVICE_NAME, key)
        .map_err(|e| e.to_string())?;
    match entry.get_password() {
        Ok(token) => Ok(Some(token)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub fn delete_token(key: &str) -> Result<(), String> {
    let entry = Entry::new(SERVICE_NAME, key)
        .map_err(|e| e.to_string())?;
    entry.delete_credential()
        .map_err(|e| e.to_string())
}
```

### Auto-Update Flow

```rust
// src-tauri/src/updater.rs

use tauri_plugin_updater::UpdaterExt;

pub async fn check_for_updates(app: tauri::AppHandle) -> Result<bool, String> {
    let updater = app.updater_builder().build()
        .map_err(|e| e.to_string())?;

    match updater.check().await {
        Ok(Some(update)) => {
            // 업데이트 알림 표시
            notify_update_available(&app, &update.version).await;
            Ok(true)
        }
        Ok(None) => Ok(false),
        Err(e) => Err(e.to_string()),
    }
}

pub async fn install_update(app: tauri::AppHandle) -> Result<(), String> {
    let updater = app.updater_builder().build()
        .map_err(|e| e.to_string())?;

    if let Some(update) = updater.check().await.map_err(|e| e.to_string())? {
        update.download_and_install(|_, _| {}, || {})
            .await
            .map_err(|e| e.to_string())?;

        // 앱 재시작
        app.restart();
    }

    Ok(())
}
```

---

## Consistency Rules

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Tauri Commands | snake_case | `save_token`, `check_for_updates` |
| Rust Modules | snake_case | `sidecar.rs`, `keychain.rs` |
| TypeScript Functions | camelCase | `saveToken`, `checkForUpdates` |
| Environment Variables | SCREAMING_SNAKE | `TAURI_SIGNING_PRIVATE_KEY` |
| Config Keys | kebab-case (JSON) | `"bundle-identifier"` |

### Code Organization

```
src-tauri/src/
├── main.rs          # 진입점, 최소한의 코드
├── lib.rs           # 모듈 선언
├── sidecar.rs       # Sidecar 관련 모든 코드
├── keychain.rs      # Keychain 관련 모든 코드
├── updater.rs       # 업데이트 관련 모든 코드
└── tray.rs          # 시스템 트레이 (Growth)
```

### Error Handling

```rust
// 모든 Tauri command는 Result<T, String> 반환
#[tauri::command]
pub fn example_command() -> Result<String, String> {
    do_something()
        .map_err(|e| format!("Operation failed: {}", e))
}
```

### Logging Strategy

```rust
// 개발: RUST_LOG=debug
// 프로덕션: RUST_LOG=info

use tracing::{info, warn, error};

info!("Sidecar started on port {}", port);
warn!("Update check failed, will retry: {}", e);
error!("Critical error: {}", e);
```

---

## Data Architecture

### Keychain Storage

| Key | Value | Purpose |
|-----|-------|---------|
| `github_access_token` | OAuth access token | API 인증 |
| `github_refresh_token` | OAuth refresh token | 토큰 갱신 |

### Existing Data (변경 없음)

- `~/.local/share/anyon/db.sqlite` - SQLite 데이터베이스
- `~/.local/share/anyon/config.json` - 사용자 설정
- `~/.local/share/anyon/port.txt` - 포트 번호 (sidecar 호환)

### Migration from credentials.json

```rust
// 첫 실행 시 기존 credentials.json → Keychain 마이그레이션
pub fn migrate_credentials() -> Result<(), String> {
    let cred_path = asset_dir().join("credentials.json");
    if cred_path.exists() {
        let creds: Credentials = read_json(&cred_path)?;
        if let Some(token) = creds.refresh_token {
            save_token("github_refresh_token", &token)?;
        }
        // 마이그레이션 후 파일 삭제
        std::fs::remove_file(&cred_path).ok();
    }
    Ok(())
}
```

---

## API Contracts

### Tauri IPC Commands

```typescript
// frontend/src/lib/tauri.ts

import { invoke } from '@tauri-apps/api/core';

// Keychain
export const saveToken = (key: string, token: string) =>
  invoke<void>('save_token', { key, token });

export const getToken = (key: string) =>
  invoke<string | null>('get_token', { key });

export const deleteToken = (key: string) =>
  invoke<void>('delete_token', { key });

// Sidecar
export const getSidecarPort = () =>
  invoke<number>('get_sidecar_port');

// Updates
export const checkForUpdates = () =>
  invoke<boolean>('check_for_updates');

export const installUpdate = () =>
  invoke<void>('install_update');
```

### Backend API (변경 없음)

기존 `localhost:PORT/api/*` 엔드포인트 유지

---

## Security Architecture

### Code Signing

**macOS:**
```yaml
# .github/workflows/release.yml
- name: Sign macOS
  env:
    APPLE_CERTIFICATE: ${{ secrets.APPLE_CERTIFICATE }}
    APPLE_CERTIFICATE_PASSWORD: ${{ secrets.APPLE_CERTIFICATE_PASSWORD }}
    APPLE_SIGNING_IDENTITY: ${{ secrets.APPLE_SIGNING_IDENTITY }}
    APPLE_ID: ${{ secrets.APPLE_ID }}
    APPLE_PASSWORD: ${{ secrets.APPLE_PASSWORD }}
    APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
```

**Windows:**
```yaml
- name: Sign Windows
  env:
    TAURI_SIGNING_PRIVATE_KEY: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY }}
    TAURI_SIGNING_PRIVATE_KEY_PASSWORD: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY_PASSWORD }}
```

### Tauri Security Config

```json
// src-tauri/capabilities/default.json
{
  "identifier": "default",
  "description": "Capability for the main window",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "shell:allow-spawn",
    "shell:allow-kill",
    "updater:default",
    "notification:default"
  ]
}
```

### CSP Configuration

```json
// src-tauri/tauri.conf.json
{
  "app": {
    "security": {
      "csp": "default-src 'self'; connect-src 'self' http://localhost:* https://api.github.com https://github.com"
    }
  }
}
```

---

## Performance Considerations

| Requirement | Target | Strategy |
|-------------|--------|----------|
| Cold start | < 3초 | Sidecar lazy loading, 최소 초기화 |
| Bundle size | < 50MB | Release 빌드, strip symbols |
| Memory (idle) | < 200MB | Sidecar 메모리 최적화 |
| Update check | < 2초 | 비동기, 백그라운드 |

---

## Deployment Architecture

### Build Matrix

```yaml
# .github/workflows/release.yml
strategy:
  matrix:
    include:
      - os: macos-14
        target: aarch64-apple-darwin
        name: macOS-ARM64
      - os: macos-13
        target: x86_64-apple-darwin
        name: macOS-x64
      - os: windows-latest
        target: x86_64-pc-windows-msvc
        name: Windows-x64
      - os: ubuntu-22.04
        target: x86_64-unknown-linux-gnu
        name: Linux-x64
```

### Release Artifacts

| Platform | Artifact | 설명 |
|----------|----------|------|
| macOS ARM64 | `Anyon_x.x.x_aarch64.dmg` | Apple Silicon |
| macOS x64 | `Anyon_x.x.x_x64.dmg` | Intel Mac |
| Windows x64 | `Anyon_x.x.x_x64-setup.exe` | NSIS installer |
| Linux x64 | `Anyon_x.x.x_amd64.AppImage` | Universal |

### Update Manifest

```json
// GitHub Release에 자동 생성
{
  "version": "1.0.0",
  "notes": "Release notes here",
  "pub_date": "2025-01-01T00:00:00Z",
  "platforms": {
    "darwin-aarch64": {
      "url": "https://github.com/.../Anyon_1.0.0_aarch64.dmg",
      "signature": "..."
    },
    "darwin-x86_64": { ... },
    "windows-x86_64": { ... },
    "linux-x86_64": { ... }
  }
}
```

---

## Development Environment

### Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Rust | stable | Backend + Tauri |
| Node.js | 18+ | Frontend |
| pnpm | 8+ | Package manager |
| Xcode | 15+ | macOS 빌드 (macOS only) |
| Visual Studio | 2022+ | Windows 빌드 (Windows only) |

### Setup Commands

```bash
# 1. 의존성 설치
pnpm install
cargo build

# 2. Tauri CLI 설치
cargo install tauri-cli

# 3. 개발 서버 시작
cargo tauri dev

# 4. 프로덕션 빌드
cargo tauri build
```

### Environment Variables

| Variable | Purpose | Required |
|----------|---------|----------|
| `TAURI_SIGNING_PRIVATE_KEY` | 업데이트 서명 키 | CI only |
| `APPLE_CERTIFICATE` | macOS 서명 인증서 | CI only |
| `APPLE_ID` | Notarization 계정 | CI only |

---

## Architecture Decision Records (ADRs)

### ADR-001: Sidecar vs Embedded Backend

**결정:** Sidecar 패턴 사용

**컨텍스트:** 기존 Rust 백엔드를 Tauri에 통합하는 방법 선택

**옵션:**
1. Embedded - Tauri 프로세스에 직접 통합
2. Sidecar - 별도 프로세스로 실행

**결정 이유:**
- 기존 코드 변경 최소화
- 독립적인 프로세스 재시작 가능
- 기존 HTTP API 호환성 유지
- npm 패키지 배포와 코드 공유

---

### ADR-002: Keychain vs Encrypted File

**결정:** OS Keychain API 사용 (keyring-rs)

**컨텍스트:** OAuth 토큰 저장 방식 선택

**옵션:**
1. OS Keychain
2. 암호화된 로컬 파일
3. 기존 credentials.json 유지

**결정 이유:**
- OS 수준 보안 (메모리 보호)
- 사용자 친숙한 방식 (다른 앱과 동일)
- 크로스플랫폼 지원 (keyring-rs)
- NFR-S4 준수

---

### ADR-003: GitHub Releases vs Custom Update Server

**결정:** GitHub Releases 사용

**컨텍스트:** 자동 업데이트 서버 선택

**옵션:**
1. GitHub Releases
2. 자체 S3 + CDN
3. 상용 서비스 (Electron Forge 등)

**결정 이유:**
- 무료
- Tauri 기본 지원
- 릴리즈 워크플로우 통합
- 충분한 다운로드 대역폭

---

## Validation Checklist

- [x] 모든 FR이 아키텍처 컴포넌트에 매핑됨
- [x] 모든 NFR이 아키텍처에서 해결됨
- [x] 프로젝트 구조가 구체적으로 정의됨
- [x] 기술 스택 버전이 명시됨
- [x] 보안 아키텍처가 정의됨
- [x] CI/CD 파이프라인이 설계됨
- [x] 개발 환경 설정이 문서화됨

---

_Generated by BMAD Decision Architecture Workflow v1.0_
_Date: 2025-11-25_
_For: BMad_
