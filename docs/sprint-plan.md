# Sprint Plan - Anyon Desktop Distribution

**Project:** Anyon Desktop Distribution
**Date:** 2025-11-25
**Total Sprints:** 5
**Total Stories:** 37

---

## Sprint Overview

| Sprint | Focus | Stories | P0 | P1 | Goal |
|--------|-------|---------|----|----|------|
| 1 | 기초 | 9 | 9 | 0 | Tauri + Sidecar 로컬 실행 |
| 2 | 보안 | 5 | 5 | 0 | Keychain 통합 |
| 3 | 배포 준비 | 10 | 10 | 0 | 업데이트 + 인스톨러 |
| 4 | 자동화 | 9 | 7 | 2 | CI/CD + 코드 서명 |
| 5 | Growth | 4 | 0 | 4 | 시스템 트레이 |

---

## Sprint 1: 기초 (Tauri + Sidecar)

**Goal:** Tauri 앱이 anyon-core sidecar와 함께 로컬에서 실행

**Epic Coverage:** E1 (전체), E2 (전체)

### Stories

| ID | Story | Priority | Dependencies |
|----|-------|----------|--------------|
| E1-S1 | Tauri 프로젝트 scaffolding | P0 | - |
| E1-S2 | Tauri 플러그인 설치 | P0 | E1-S1 |
| E1-S3 | 앱 아이콘 및 메타데이터 | P0 | E1-S1 |
| E1-S4 | Frontend 연동 설정 | P0 | E1-S3 |
| E2-S1 | Sidecar 바이너리 설정 | P0 | E1-S2 |
| E2-S2 | Sidecar 시작 로직 | P0 | E2-S1 |
| E2-S3 | Sidecar 종료 로직 | P0 | E2-S2 |
| E2-S4 | Sidecar 상태 모니터링 | P0 | E2-S3 |
| E2-S5 | Frontend에 포트 정보 전달 | P0 | E2-S2 |

### Definition of Done
- [ ] `cargo tauri dev` 실행 시 앱 창이 열림
- [ ] anyon-core sidecar가 자동으로 시작됨
- [ ] Frontend가 sidecar API와 통신 성공
- [ ] 앱 종료 시 sidecar 정상 종료
- [ ] 기존 모든 기능이 데스크톱 앱에서 동작

### Technical Setup (Sprint 시작 전)
```bash
# Tauri CLI 설치
cargo install tauri-cli

# 프로젝트 초기화
cargo tauri init
```

---

## Sprint 2: 보안 (Keychain 통합)

**Goal:** OAuth 토큰이 OS Keychain에 안전하게 저장됨

**Epic Coverage:** E3 (전체)

### Stories

| ID | Story | Priority | Dependencies |
|----|-------|----------|--------------|
| E3-S1 | keyring-rs 통합 | P0 | Sprint 1 완료 |
| E3-S2 | Keychain IPC 커맨드 구현 | P0 | E3-S1 |
| E3-S3 | Frontend Keychain 유틸리티 | P0 | E3-S2 |
| E3-S4 | credentials.json 마이그레이션 | P0 | E3-S3 |
| E3-S5 | 인증 플로우 업데이트 | P0 | E3-S4 |

### Definition of Done
- [ ] 새 로그인 시 토큰이 Keychain에 저장됨
- [ ] 앱 재시작 후 로그인 상태 유지
- [ ] 기존 credentials.json 사용자 자동 마이그레이션
- [ ] 로그아웃 시 Keychain에서 토큰 삭제
- [ ] credentials.json 파일이 더 이상 생성되지 않음

---

## Sprint 3: 배포 준비 (업데이트 + 인스톨러)

**Goal:** 자동 업데이트 작동, 플랫폼별 인스톨러 생성

**Epic Coverage:** E4 (전체), E5 (전체)

### Stories

| ID | Story | Priority | Dependencies |
|----|-------|----------|--------------|
| E4-S6 | 업데이트 서명 키 생성 | P0 | - |
| E4-S1 | Updater 플러그인 설정 | P0 | E4-S6 |
| E4-S2 | 업데이트 체크 로직 | P0 | E4-S1 |
| E4-S3 | 업데이트 알림 UI | P0 | E4-S2 |
| E4-S4 | 업데이트 다운로드 및 설치 | P0 | E4-S3 |
| E4-S5 | Frontend 업데이트 UI | P0 | E4-S4 |
| E5-S1 | macOS DMG 인스톨러 | P0 | Sprint 2 완료 |
| E5-S2 | Windows NSIS 인스톨러 | P0 | Sprint 2 완료 |
| E5-S3 | Linux AppImage | P0 | Sprint 2 완료 |
| E5-S4 | 인스톨러 테스트 | P0 | E5-S1, E5-S2, E5-S3 |

### Definition of Done
- [ ] Ed25519 서명 키 생성 및 백업 완료
- [ ] 앱 시작 시 업데이트 자동 체크
- [ ] 업데이트 알림 다이얼로그 표시
- [ ] 업데이트 설치 후 자동 재시작
- [ ] macOS DMG 정상 생성 및 설치 테스트
- [ ] Windows EXE 정상 생성 및 설치 테스트
- [ ] Linux AppImage 정상 생성 및 실행 테스트

### ⚠️ Action Required (Sprint 시작 전)
```bash
# 서명 키 생성
cargo tauri signer generate -w ~/.tauri/anyon.key

# 키 백업 필수! (분실 시 업데이트 불가)
```

---

## Sprint 4: 자동화 (CI/CD + 코드 서명)

**Goal:** GitHub Actions로 자동 빌드/서명/릴리즈

**Epic Coverage:** E6 (전체), E7 (전체)

### Stories

| ID | Story | Priority | Dependencies |
|----|-------|----------|--------------|
| E6-S1 | PR 빌드 워크플로우 | P0 | Sprint 3 완료 |
| E6-S2 | 릴리즈 워크플로우 | P0 | E6-S1 |
| E6-S3 | 아티팩트 업로드 설정 | P0 | E6-S2 |
| E6-S4 | 의존성 취약점 스캔 | P1 | E6-S1 |
| E6-S5 | 캐싱 최적화 | P1 | E6-S1 |
| E7-S1 | macOS Developer ID 설정 | P0 | E6-S2 |
| E7-S2 | macOS Notarization 설정 | P0 | E7-S1 |
| E7-S3 | Windows EV 코드 서명 | P0 | E6-S2 |
| E7-S4 | 서명 검증 테스트 | P0 | E7-S2, E7-S3 |

### Definition of Done
- [ ] PR마다 자동 빌드 실행
- [ ] 태그 푸시 시 자동 릴리즈 생성
- [ ] macOS 앱 서명 + Notarization 완료
- [ ] Windows 앱 서명 완료, SmartScreen 경고 없음
- [ ] GitHub Releases에 모든 아티팩트 업로드
- [ ] latest.json 업데이트 매니페스트 자동 생성

### ⚠️ Prerequisites (Sprint 시작 전 필수)
- [ ] Apple Developer Program 등록 ($99)
- [ ] Apple Developer ID Application 인증서 생성
- [ ] Windows EV Code Signing 인증서 구매 ($300-500)
- [ ] GitHub Secrets 설정:
  - `APPLE_CERTIFICATE`
  - `APPLE_CERTIFICATE_PASSWORD`
  - `APPLE_SIGNING_IDENTITY`
  - `APPLE_ID`
  - `APPLE_PASSWORD`
  - `APPLE_TEAM_ID`
  - `TAURI_SIGNING_PRIVATE_KEY`
  - (Windows EV 관련 secrets)

---

## Sprint 5: Growth (시스템 트레이)

**Goal:** 시스템 트레이 및 백그라운드 실행

**Epic Coverage:** E8 (전체)

### Stories

| ID | Story | Priority | Dependencies |
|----|-------|----------|--------------|
| E8-S1 | 트레이 아이콘 구현 | P1 | Sprint 4 완료 |
| E8-S2 | 트레이 메뉴 구현 | P1 | E8-S1 |
| E8-S3 | 백그라운드 실행 | P1 | E8-S2 |
| E8-S4 | 시작 시 자동 실행 | P1 | E8-S3 |

### Definition of Done
- [ ] 시스템 트레이에 앱 아이콘 표시
- [ ] 트레이 메뉴로 앱 제어 가능
- [ ] 창 닫기 시 백그라운드 실행
- [ ] OS 부팅 시 자동 시작 (옵션)

---

## Release Milestones

| Version | Sprint | Release Type | Features |
|---------|--------|--------------|----------|
| v0.1.0-alpha | Sprint 1 | Internal | Tauri + Sidecar 기본 동작 |
| v0.2.0-alpha | Sprint 2 | Internal | Keychain 보안 |
| v0.3.0-beta | Sprint 3 | Beta | 업데이트 + 인스톨러 (서명 없음) |
| v1.0.0 | Sprint 4 | Stable | 완전한 코드 서명 릴리즈 |
| v1.1.0 | Sprint 5 | Stable | 시스템 트레이 추가 |

---

## Cost Timeline

| Sprint | Cost Item | Amount |
|--------|-----------|--------|
| Sprint 4 | Apple Developer Program | $99 |
| Sprint 4 | Windows EV Certificate | $300-500 |
| **Total** | | **$399-599** |

---

## Risk Mitigation by Sprint

| Sprint | Risk | Mitigation |
|--------|------|------------|
| 1 | Sidecar 포트 충돌 | 동적 포트 할당 구현 |
| 2 | Keychain 권한 거부 | 적절한 에러 핸들링 |
| 3 | 인스톨러 테스트 부족 | 각 플랫폼 수동 테스트 |
| 4 | 인증서 발급 지연 | 조기 신청 (Sprint 3 중) |
| 4 | Notarization 실패 | entitlements 사전 검증 |

---

## Quick Start Commands

```bash
# Sprint 1 시작
cargo install tauri-cli
cargo tauri init
cargo tauri dev

# Sprint 3 - 서명 키 생성
cargo tauri signer generate -w ~/.tauri/anyon.key

# 로컬 빌드 테스트
cargo tauri build

# 릴리즈 (태그 푸시)
git tag v1.0.0
git push origin v1.0.0
```

---

_Generated by BMAD Sprint Planning Workflow_
_Date: 2025-11-25_
