# Product Brief: Anyon Desktop Distribution

## 1. Executive Summary

Anyon을 데스크톱 설치 파일로 배포하여 일반 사용자도 쉽게 설치하고 사용할 수 있도록 한다. 보안(코드 서명, 자동 업데이트, 자격 증명 보호)을 최우선으로 고려한다.

## 2. Problem Statement

### 현재 상황
- npm 패키지로만 배포 (`npx anyon`)
- 기술적 사용자만 접근 가능
- 코드 서명 없음 → OS 보안 경고 발생
- 자동 업데이트 없음
- 자격 증명이 평문 파일로 저장

### 해결해야 할 문제
1. 비개발자도 쉽게 설치할 수 있는 설치 파일 제공
2. OS 보안 경고 없이 신뢰할 수 있는 앱으로 인식
3. 자동 업데이트로 최신 버전 유지
4. 민감한 정보(OAuth 토큰)를 안전하게 보관

## 3. Target Users

| 사용자 유형 | 설명 | 니즈 |
|------------|------|------|
| 개발자 | 현재 주요 사용자 | CLI/npm 방식도 유지 |
| PM/디자이너 | 기술적 배경 적음 | 원클릭 설치, GUI |
| 기업 사용자 | IT 정책 준수 필요 | 코드 서명, 보안 인증 |

## 4. Proposed Solution: Tauri Desktop App

### Why Tauri?
- 이미 Rust 백엔드 사용 → 자연스러운 통합
- 경량 (10-20MB vs Electron 150MB+)
- 보안 우수 (기본 샌드박스, CSP)
- 자동 업데이트 내장
- 크로스플랫폼 (Windows, macOS, Linux)

### Architecture Overview

```
┌─────────────────────────────────────────────────┐
│              Tauri Desktop App                  │
├─────────────────────────────────────────────────┤
│  ┌───────────────┐    ┌───────────────────────┐ │
│  │  Tauri Shell  │    │   Sidecar Processes   │ │
│  │  (Rust)       │    │  ┌─────────────────┐  │ │
│  │               │    │  │   anyon-core    │  │ │
│  │  - Window     │◄───┤  │   (기존 server) │  │ │
│  │  - Tray       │    │  └─────────────────┘  │ │
│  │  - Updater    │    │  ┌─────────────────┐  │ │
│  │  - Keychain   │    │  │   anyon-mcp     │  │ │
│  │               │    │  └─────────────────┘  │ │
│  └───────────────┘    └───────────────────────┘ │
│         │                                       │
│         ▼                                       │
│  ┌───────────────────────────────────────────┐ │
│  │           WebView (Frontend)              │ │
│  │           React + TypeScript              │ │
│  └───────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

## 5. Key Features

### 5.1 Installation & Distribution
- **플랫폼별 설치 파일**
  - macOS: DMG (+ Homebrew Cask)
  - Windows: NSIS Installer / MSI
  - Linux: AppImage, deb, rpm

### 5.2 Security
- **코드 서명**
  - macOS: Developer ID + Notarization
  - Windows: EV Code Signing Certificate
  - Linux: GPG Signature

- **자격 증명 보호**
  - OS Keychain API 사용 (keyring-rs)
  - 평문 파일 저장 제거

- **자동 업데이트**
  - Tauri Updater
  - Ed25519 서명 검증
  - HTTPS 전용

### 5.3 User Experience
- 시스템 트레이 아이콘
- 네이티브 알림
- 다크/라이트 모드 자동 감지
- 시작 시 자동 실행 (선택)

## 6. Technical Requirements

### 6.1 New Components

| 컴포넌트 | 위치 | 설명 |
|----------|------|------|
| src-tauri/ | 프로젝트 루트 | Tauri 앱 코드 |
| installer/ | 프로젝트 루트 | 플랫폼별 인스톨러 설정 |

### 6.2 Modified Components

| 컴포넌트 | 변경 사항 |
|----------|----------|
| crates/server | anyon-core로 리네임, sidecar로 실행 |
| crates/services/auth | OS Keychain 통합 |
| frontend/ | Tauri IPC 통합 |

### 6.3 CI/CD Pipeline
- GitHub Actions 멀티플랫폼 빌드
- 자동 코드 서명
- GitHub Releases 배포
- 자동 업데이트 매니페스트 생성

## 7. Security Considerations

### 7.1 Must Have
- [ ] 코드 서명 (모든 플랫폼)
- [ ] OS Keychain으로 토큰 저장
- [ ] HTTPS 강제
- [ ] CSP 설정
- [ ] Tauri allowlist 제한

### 7.2 Should Have
- [ ] Certificate Pinning
- [ ] 자동 업데이트 서명 검증
- [ ] cargo audit CI 통합

### 7.3 Nice to Have
- [ ] 바이너리 난독화
- [ ] 런타임 무결성 검사

## 8. Cost Estimate

| 항목 | 비용 | 주기 |
|------|------|------|
| Apple Developer Program | $99 | 연간 |
| Windows EV Code Signing | $300-500 | 연간 |
| 도메인 (releases.anyon.ai) | ~$12 | 연간 |
| CI (GitHub Actions) | $0 | - |

## 9. Success Metrics

- 설치 완료율 > 95%
- OS 보안 경고 발생률 0%
- 자동 업데이트 성공률 > 99%
- 사용자 피드백: "설치가 쉬웠다"

## 10. Out of Scope

- 모바일 앱 (iOS, Android)
- 웹 버전 호스팅
- 기존 npm 배포 방식 제거 (병행 유지)

## 11. Open Questions

1. 업데이트 서버를 GitHub Releases로 할지, 자체 서버로 할지?
2. 베타 채널 운영 여부?
3. 텔레메트리/크래시 리포팅 수준?

---

*이 문서는 BMAD Method workflow-init의 입력으로 사용됩니다.*
