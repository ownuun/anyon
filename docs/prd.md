# Anyon Desktop Distribution - Product Requirements Document

**Author:** BMad
**Date:** 2025-11-25
**Version:** 1.0

---

## Executive Summary

Anyon을 데스크톱 설치 파일로 배포하여, 기술적 배경이 없는 사용자도 **보안 경고 없이 원클릭으로 설치하고 바로 실행**할 수 있도록 한다.

현재 npm 패키지 방식은 개발자 전용이며, 코드 서명 부재로 OS 보안 경고가 발생하고, 자격 증명이 평문으로 저장되는 보안 취약점이 있다. 이 프로젝트는 Tauri 기반 데스크톱 앱으로 전환하여 이 모든 문제를 해결한다.

### What Makes This Special

**"보안을 잘 챙기면서 설치하고 바로 실행"**

보안과 편의성은 보통 trade-off 관계지만, 이 프로젝트는 둘 다 잡는다:
- 코드 서명 + Notarization으로 OS가 신뢰하는 앱
- OS Keychain으로 자격 증명 보호
- 자동 업데이트로 항상 최신 보안 패치
- 그러면서도 **원클릭 설치, 즉시 실행**

---

## Project Classification

**Technical Type:** desktop_app
**Domain:** general (developer tools)
**Complexity:** medium

이 프로젝트는 기존 Anyon 웹앱을 Tauri로 래핑하여 네이티브 데스크톱 앱으로 배포하는 것이다. 특수 규제 도메인(의료, 금융 등)이 아니므로 일반적인 소프트웨어 보안 모범 사례를 따른다.

**기존 코드베이스:**
- Backend: Rust (Axum, SQLite)
- Frontend: React + TypeScript + Vite
- 현재 배포: npm 패키지 (`npx anyon`)

---

## Success Criteria

### Primary Success Metrics

| 지표 | 목표 | 측정 방법 |
|------|------|----------|
| 설치 완료율 | > 95% | 설치 시작 대비 완료 비율 |
| OS 보안 경고 발생률 | 0% | 사용자 피드백, 지원 티켓 |
| 자동 업데이트 성공률 | > 99% | 업데이트 서버 로그 |
| 첫 실행까지 시간 | < 60초 | 설치 시작부터 앱 실행까지 |

### User Success Definition

- **개발자:** "npm 방식과 데스크톱 앱 중 선택할 수 있어서 좋다"
- **PM/디자이너:** "설치가 너무 쉬웠다, 그냥 더블클릭하면 됨"
- **기업 IT 관리자:** "코드 서명되어 있어서 배포 정책에 문제없다"

---

## Product Scope

### MVP - Minimum Viable Product

**핵심 목표:** 3대 플랫폼에서 보안 경고 없이 설치 가능한 데스크톱 앱

| 기능 | 설명 | 우선순위 |
|------|------|----------|
| Tauri 앱 래핑 | 기존 frontend를 Tauri WebView로 래핑 | P0 |
| Sidecar 실행 | anyon-core(기존 server)를 sidecar로 실행 | P0 |
| 플랫폼별 인스톨러 | macOS DMG, Windows NSIS, Linux AppImage | P0 |
| 코드 서명 (macOS) | Developer ID + Notarization | P0 |
| 코드 서명 (Windows) | EV Code Signing Certificate | P0 |
| OS Keychain 통합 | OAuth 토큰을 OS Keychain에 저장 | P0 |
| 기본 자동 업데이트 | Tauri Updater + GitHub Releases | P0 |
| CI/CD 파이프라인 | GitHub Actions 멀티플랫폼 빌드 | P0 |

### Growth Features (Post-MVP)

| 기능 | 설명 | 우선순위 |
|------|------|----------|
| 시스템 트레이 | 백그라운드 실행, 트레이 아이콘 | P1 |
| 시작 시 자동 실행 | OS 부팅 시 자동 시작 (선택) | P1 |
| 네이티브 알림 | OS 알림 시스템 통합 | P1 |
| 베타 채널 | 베타 버전 opt-in 업데이트 | P1 |
| Homebrew Cask | macOS Homebrew 배포 | P2 |
| Chocolatey | Windows Chocolatey 배포 | P2 |
| Linux 패키지 | deb, rpm, AUR 패키지 | P2 |

### Vision (Future)

| 기능 | 설명 |
|------|------|
| 딥 OS 통합 | 파일 연결, 컨텍스트 메뉴, Spotlight/검색 통합 |
| 오프라인 모드 | 인터넷 없이도 기본 기능 사용 |
| 플러그인 시스템 | 사용자 확장 기능 |
| 멀티 인스턴스 | 여러 프로젝트 동시 실행 |

---

## Desktop App Specific Requirements

### Platform Support

| 플랫폼 | 아키텍처 | 인스톨러 형식 | 최소 OS 버전 |
|--------|----------|--------------|--------------|
| macOS | x64, ARM64 | DMG | macOS 10.15+ |
| Windows | x64, ARM64 | NSIS (.exe) | Windows 10+ |
| Linux | x64, ARM64 | AppImage | glibc 2.31+ |

### System Integration

| 기능 | macOS | Windows | Linux |
|------|-------|---------|-------|
| 코드 서명 | Developer ID + Notarization | EV Certificate + SmartScreen | GPG (선택) |
| Keychain | Keychain Services | Credential Manager | libsecret |
| 자동 업데이트 | Tauri Updater | Tauri Updater | Tauri Updater |
| 시스템 트레이 | ✅ | ✅ | ✅ |
| 알림 | Notification Center | Toast | libnotify |

### Update Strategy

- **업데이트 서버:** GitHub Releases
- **매니페스트:** `update.json` (Tauri 표준 형식)
- **서명:** Ed25519 (Tauri 내장)
- **채널:** stable (기본), beta (opt-in)
- **롤백:** 업데이트 실패 시 이전 버전 복원

### Offline Capabilities (MVP)

- 앱 실행: 온라인 필요 없음
- 기존 데이터 접근: 로컬 SQLite이므로 오프라인 가능
- GitHub 연동 기능: 온라인 필요

---

## User Experience Principles

### Design Philosophy

- **네이티브 느낌:** OS별 UI 가이드라인 존중
- **무간섭:** 설치 후 추가 설정 최소화
- **신뢰감:** 보안 경고 없음 = 전문적인 소프트웨어

### Key Interactions

| 상호작용 | 기대 경험 |
|----------|----------|
| 설치 | 다운로드 → 더블클릭 → 완료 (60초 이내) |
| 첫 실행 | 앱 열기 → 바로 사용 가능 |
| 업데이트 | 알림 → 원클릭 업데이트 → 자동 재시작 |
| 인증 | GitHub 로그인 → OS Keychain 자동 저장 |

---

## Functional Requirements

### Installation & Lifecycle

- **FR1:** 사용자는 플랫폼별 인스톨러(DMG/EXE/AppImage)를 다운로드하여 설치할 수 있다
- **FR2:** 설치 과정에서 OS 보안 경고가 발생하지 않는다 (코드 서명)
- **FR3:** 사용자는 설치된 앱을 일반 앱처럼 실행할 수 있다
- **FR4:** 앱 실행 시 anyon-core sidecar가 자동으로 시작된다
- **FR5:** 앱 종료 시 sidecar 프로세스가 정상 종료된다
- **FR6:** 사용자는 앱을 일반 방식으로 제거(언인스톨)할 수 있다

### Auto-Update

- **FR7:** 앱 시작 시 자동으로 업데이트 확인을 수행한다
- **FR8:** 새 버전이 있으면 사용자에게 알림을 표시한다
- **FR9:** 사용자는 원클릭으로 업데이트를 설치할 수 있다
- **FR10:** 업데이트 설치 후 앱이 자동으로 재시작된다
- **FR11:** 업데이트 실패 시 이전 버전으로 롤백된다
- **FR12:** 사용자는 업데이트 알림을 나중으로 미룰 수 있다

### Security & Authentication

- **FR13:** OAuth 토큰은 OS Keychain에 암호화 저장된다
- **FR14:** 평문 credentials.json 파일은 더 이상 사용되지 않는다
- **FR15:** 사용자는 GitHub OAuth로 로그인할 수 있다
- **FR16:** 로그인 상태는 앱 재시작 후에도 유지된다
- **FR17:** 사용자는 앱 내에서 로그아웃할 수 있다
- **FR18:** 로그아웃 시 Keychain에서 토큰이 삭제된다

### System Tray (Growth)

- **FR19:** 앱은 시스템 트레이에 아이콘을 표시할 수 있다
- **FR20:** 트레이 아이콘 클릭 시 앱 창이 토글된다
- **FR21:** 트레이 아이콘 우클릭 시 컨텍스트 메뉴가 표시된다
- **FR22:** 사용자는 창을 닫아도 앱을 백그라운드에서 실행할 수 있다

### Existing Functionality Preservation

- **FR23:** 기존 Anyon의 모든 기능이 데스크톱 앱에서 동일하게 작동한다
- **FR24:** 기존 `~/.local/share/anyon/` 데이터가 그대로 사용된다
- **FR25:** MCP 서버(anyon-mcp)가 데스크톱 앱과 함께 배포된다
- **FR26:** npm 패키지 배포 방식이 병행 유지된다

---

## Non-Functional Requirements

### Security

| 요구사항 | 상세 | 우선순위 |
|----------|------|----------|
| NFR-S1 | 모든 배포 바이너리는 코드 서명되어야 한다 | P0 |
| NFR-S2 | macOS 앱은 Apple Notarization을 통과해야 한다 | P0 |
| NFR-S3 | Windows 앱은 SmartScreen 경고가 없어야 한다 | P0 |
| NFR-S4 | 자격 증명은 OS Keychain API로만 저장한다 | P0 |
| NFR-S5 | 자동 업데이트는 Ed25519 서명 검증을 수행한다 | P0 |
| NFR-S6 | 모든 외부 통신은 HTTPS를 사용한다 | P0 |
| NFR-S7 | Tauri allowlist로 IPC 권한을 최소화한다 | P1 |
| NFR-S8 | CSP(Content Security Policy)를 적용한다 | P1 |
| NFR-S9 | cargo audit으로 의존성 취약점을 CI에서 검사한다 | P1 |

### Performance

| 요구사항 | 상세 | 목표 |
|----------|------|------|
| NFR-P1 | 앱 시작 시간 (cold start) | < 3초 |
| NFR-P2 | 설치 파일 크기 | < 50MB |
| NFR-P3 | 메모리 사용량 (idle) | < 200MB |
| NFR-P4 | 업데이트 확인 시간 | < 2초 |

### Reliability

| 요구사항 | 상세 |
|----------|------|
| NFR-R1 | 업데이트 실패 시 자동 롤백 |
| NFR-R2 | Sidecar 크래시 시 자동 재시작 |
| NFR-R3 | 오프라인 상태에서도 앱 실행 가능 |

### Maintainability

| 요구사항 | 상세 |
|----------|------|
| NFR-M1 | CI/CD로 모든 플랫폼 빌드 자동화 |
| NFR-M2 | 릴리즈 노트 자동 생성 |
| NFR-M3 | 크래시 리포팅 (Sentry) 통합 |

---

## Technical Constraints

### Tauri Framework

- Tauri 2.x 사용 (stable)
- Frontend: 기존 React 앱 재사용
- Backend: Tauri Rust core + anyon-core sidecar

### Sidecar Architecture

```
Tauri App (main process)
    │
    ├── WebView (frontend)
    │       │
    │       └── localhost:PORT ──┐
    │                            │
    └── Sidecar Manager          │
            │                    │
            └── anyon-core ◄─────┘
                (HTTP server)
```

- Tauri가 sidecar 프로세스 생명주기 관리
- Frontend는 기존처럼 localhost HTTP로 통신
- Port는 동적 할당 후 IPC로 전달

### Build Matrix

| OS | Arch | Runner | 인스톨러 |
|----|------|--------|----------|
| macOS | x64 | macos-13 | DMG |
| macOS | ARM64 | macos-14 | DMG |
| Windows | x64 | windows-latest | NSIS |
| Windows | ARM64 | windows-latest | NSIS |
| Linux | x64 | ubuntu-22.04 | AppImage |
| Linux | ARM64 | ubuntu-22.04-arm | AppImage |

---

## Dependencies & Costs

### External Dependencies

| 항목 | 용도 | 비용 |
|------|------|------|
| Apple Developer Program | macOS 코드 서명 + Notarization | $99/년 |
| Windows EV Code Signing | Windows 코드 서명 | $300-500/년 |
| GitHub Actions | CI/CD | 무료 (public repo) |
| GitHub Releases | 배포 + 업데이트 서버 | 무료 |

### Rust Crates (New)

| Crate | 용도 |
|-------|------|
| tauri | 데스크톱 앱 프레임워크 |
| tauri-plugin-updater | 자동 업데이트 |
| keyring | OS Keychain 통합 |
| tauri-plugin-shell | Sidecar 관리 |

---

## Out of Scope

- 모바일 앱 (iOS, Android)
- 웹 호스팅 버전
- 기존 npm 배포 방식 제거 (병행 유지)
- Windows Store / Mac App Store 배포
- Linux Snap / Flatpak (초기 버전)

---

## Open Questions (Resolved)

| 질문 | 결정 |
|------|------|
| 업데이트 서버? | GitHub Releases 사용 |
| 베타 채널? | Growth 단계에서 추가 |
| 텔레메트리? | 기존 Sentry/PostHog 유지 |

---

## PRD Summary

| 항목 | 수량 |
|------|------|
| Functional Requirements | 26개 |
| Non-Functional Requirements | 16개 |
| MVP 기능 | 8개 |
| Growth 기능 | 7개 |

---

*이 PRD는 "보안을 잘 챙기면서 설치하고 바로 실행"이라는 핵심 가치를 구현하기 위한 Anyon Desktop Distribution 프로젝트의 요구사항을 정의한다.*

*BMad와 AI facilitator의 협업으로 작성됨.*
