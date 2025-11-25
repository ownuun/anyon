# Anyon Desktop Distribution - Epics & Stories

**Project:** Anyon Desktop Distribution
**Date:** 2025-11-25
**Source:** PRD (26 FRs, 16 NFRs) + Architecture

---

## Epic Overview

| Epic | 이름 | Stories | Priority | FR Coverage |
|------|------|---------|----------|-------------|
| E1 | Tauri 프로젝트 초기화 | 4 | P0 | FR1, FR3 |
| E2 | Sidecar 프로세스 관리 | 5 | P0 | FR4, FR5, FR23-25 |
| E3 | OS Keychain 통합 | 5 | P0 | FR13-18 |
| E4 | 자동 업데이트 시스템 | 6 | P0 | FR7-12 |
| E5 | 플랫폼별 인스톨러 | 4 | P0 | FR1, FR2, FR6 |
| E6 | CI/CD 파이프라인 | 5 | P0 | NFR-M1, M2 |
| E7 | 코드 서명 | 4 | P0 | NFR-S1, S2, S3 |
| E8 | 시스템 트레이 (Growth) | 4 | P1 | FR19-22 |

**Total:** 8 Epics, 37 Stories

---

## Epic 1: Tauri 프로젝트 초기화

**목표:** 기존 프로젝트에 Tauri 2.x를 추가하고 기본 데스크톱 앱 구조 구축

**FR Coverage:** FR1, FR3
**NFR Coverage:** NFR-P1, NFR-P2

### Stories

#### E1-S1: Tauri 프로젝트 scaffolding
**Priority:** P0

**설명:**
기존 anyon-mvp 프로젝트에 Tauri 2.x를 초기화한다.

**Acceptance Criteria:**
- [ ] `cargo tauri init` 실행하여 src-tauri/ 디렉토리 생성
- [ ] Cargo.toml 워크스페이스에 src-tauri 추가
- [ ] tauri.conf.json 기본 설정 완료
- [ ] `cargo tauri dev` 실행 시 빈 창이 뜸

**Technical Notes:**
```bash
cargo install tauri-cli
cargo tauri init
```

---

#### E1-S2: Tauri 플러그인 설치
**Priority:** P0

**설명:**
필요한 Tauri 플러그인들을 설치하고 설정한다.

**Acceptance Criteria:**
- [ ] tauri-plugin-shell 설치 (sidecar용)
- [ ] tauri-plugin-updater 설치 (자동 업데이트용)
- [ ] tauri-plugin-notification 설치 (알림용)
- [ ] src-tauri/Cargo.toml에 의존성 추가
- [ ] main.rs에서 플러그인 등록

**Technical Notes:**
```toml
[dependencies]
tauri-plugin-shell = "2"
tauri-plugin-updater = "2"
tauri-plugin-notification = "2"
```

---

#### E1-S3: 앱 아이콘 및 메타데이터 설정
**Priority:** P0

**설명:**
앱 아이콘과 bundle identifier 등 메타데이터를 설정한다.

**Acceptance Criteria:**
- [ ] 앱 아이콘 생성 (icon.icns, icon.ico, icon.png)
- [ ] src-tauri/icons/ 디렉토리에 아이콘 배치
- [ ] tauri.conf.json에서 bundle identifier 설정: `ai.anyon.desktop`
- [ ] 앱 이름, 버전, 설명 설정

---

#### E1-S4: Frontend 연동 설정
**Priority:** P0

**설명:**
기존 React frontend를 Tauri WebView에서 로드하도록 설정한다.

**Acceptance Criteria:**
- [ ] tauri.conf.json의 devUrl을 frontend dev 서버로 설정
- [ ] 빌드 시 frontend dist를 임베드하도록 설정
- [ ] `cargo tauri dev` 실행 시 React 앱이 표시됨
- [ ] Hot reload가 정상 작동

**Technical Notes:**
```json
{
  "build": {
    "devUrl": "http://localhost:3000",
    "frontendDist": "../frontend/dist"
  }
}
```

---

## Epic 2: Sidecar 프로세스 관리

**목표:** anyon-core 백엔드를 Tauri의 sidecar로 실행하고 생명주기 관리

**FR Coverage:** FR4, FR5, FR23, FR24, FR25
**NFR Coverage:** NFR-R2

### Stories

#### E2-S1: Sidecar 바이너리 설정
**Priority:** P0

**설명:**
anyon-core를 Tauri sidecar로 등록한다.

**Acceptance Criteria:**
- [ ] tauri.conf.json에 sidecar 설정 추가
- [ ] 바이너리 이름을 anyon-core-{target_triple}로 설정
- [ ] 빌드 스크립트에서 sidecar 바이너리 복사
- [ ] capabilities에 shell:allow-spawn 권한 추가

**Technical Notes:**
```json
{
  "bundle": {
    "externalBin": ["sidecars/anyon-core"]
  }
}
```

---

#### E2-S2: Sidecar 시작 로직 구현
**Priority:** P0

**설명:**
앱 시작 시 anyon-core sidecar를 spawn하고 포트를 파싱한다.

**Acceptance Criteria:**
- [ ] src-tauri/src/sidecar.rs 생성
- [ ] start_sidecar() 함수 구현
- [ ] stdout에서 포트 번호 파싱
- [ ] 포트를 앱 상태에 저장
- [ ] 시작 실패 시 에러 처리

**Technical Notes:**
```rust
pub async fn start_sidecar(app: &AppHandle) -> Result<u16, String>
```

---

#### E2-S3: Sidecar 종료 로직 구현
**Priority:** P0

**설명:**
앱 종료 시 sidecar 프로세스를 정상 종료한다.

**Acceptance Criteria:**
- [ ] stop_sidecar() 함수 구현
- [ ] Tauri exit 이벤트에서 sidecar 종료 호출
- [ ] 종료 실패 시 force kill
- [ ] 좀비 프로세스 방지

---

#### E2-S4: Sidecar 상태 모니터링
**Priority:** P0

**설명:**
Sidecar 프로세스 상태를 모니터링하고 크래시 시 재시작한다.

**Acceptance Criteria:**
- [ ] sidecar 프로세스 상태 체크 주기적 실행
- [ ] 비정상 종료 감지
- [ ] 자동 재시작 (최대 3회)
- [ ] 재시작 실패 시 사용자에게 알림

---

#### E2-S5: Frontend에 포트 정보 전달
**Priority:** P0

**설명:**
Frontend가 sidecar의 포트를 알 수 있도록 IPC 커맨드 제공

**Acceptance Criteria:**
- [ ] get_sidecar_port Tauri command 구현
- [ ] frontend/src/lib/tauri.ts에 getSidecarPort() 추가
- [ ] frontend 초기화 시 포트 조회
- [ ] API 클라이언트가 동적 포트 사용

---

## Epic 3: OS Keychain 통합

**목표:** OAuth 토큰을 OS Keychain에 안전하게 저장

**FR Coverage:** FR13, FR14, FR15, FR16, FR17, FR18
**NFR Coverage:** NFR-S4

### Stories

#### E3-S1: keyring-rs 통합
**Priority:** P0

**설명:**
keyring-rs crate를 추가하고 기본 설정

**Acceptance Criteria:**
- [ ] src-tauri/Cargo.toml에 keyring = "3" 추가
- [ ] SERVICE_NAME 상수 정의: "ai.anyon.desktop"
- [ ] 각 플랫폼에서 컴파일 확인

---

#### E3-S2: Keychain IPC 커맨드 구현
**Priority:** P0

**설명:**
Frontend에서 호출할 Keychain 관련 Tauri 커맨드 구현

**Acceptance Criteria:**
- [ ] src-tauri/src/keychain.rs 생성
- [ ] save_token(key, token) 커맨드 구현
- [ ] get_token(key) 커맨드 구현
- [ ] delete_token(key) 커맨드 구현
- [ ] 에러 핸들링 (권한 거부 등)

---

#### E3-S3: Frontend Keychain 유틸리티
**Priority:** P0

**설명:**
Frontend에서 Keychain을 사용하기 위한 TypeScript 유틸리티

**Acceptance Criteria:**
- [ ] frontend/src/lib/tauri.ts에 Keychain 함수 추가
- [ ] saveToken(), getToken(), deleteToken() 구현
- [ ] 기존 auth 로직에서 Keychain 사용하도록 수정

---

#### E3-S4: credentials.json 마이그레이션
**Priority:** P0

**설명:**
기존 credentials.json에서 Keychain으로 마이그레이션

**Acceptance Criteria:**
- [ ] 앱 첫 실행 시 credentials.json 체크
- [ ] 존재하면 토큰을 Keychain으로 이동
- [ ] 마이그레이션 후 credentials.json 삭제
- [ ] 마이그레이션 로그 기록

---

#### E3-S5: 인증 플로우 업데이트
**Priority:** P0

**설명:**
기존 GitHub OAuth 플로우를 Keychain 사용하도록 수정

**Acceptance Criteria:**
- [ ] 로그인 성공 시 토큰을 Keychain에 저장
- [ ] 앱 시작 시 Keychain에서 토큰 로드
- [ ] 로그아웃 시 Keychain에서 토큰 삭제
- [ ] 토큰 갱신 시 Keychain 업데이트

---

## Epic 4: 자동 업데이트 시스템

**목표:** Tauri Updater를 사용한 자동 업데이트 구현

**FR Coverage:** FR7, FR8, FR9, FR10, FR11, FR12
**NFR Coverage:** NFR-S5, NFR-P4

### Stories

#### E4-S1: Updater 플러그인 설정
**Priority:** P0

**설명:**
tauri-plugin-updater 설정 및 업데이트 서버 구성

**Acceptance Criteria:**
- [ ] tauri.conf.json에 updater 설정 추가
- [ ] 업데이트 엔드포인트: GitHub Releases
- [ ] Ed25519 퍼블릭 키 설정
- [ ] 업데이트 체크 간격 설정

**Technical Notes:**
```json
{
  "plugins": {
    "updater": {
      "endpoints": [
        "https://github.com/SL-IT-AMAZING/anyon-mvp/releases/latest/download/latest.json"
      ],
      "pubkey": "..."
    }
  }
}
```

---

#### E4-S2: 업데이트 체크 로직 구현
**Priority:** P0

**설명:**
앱 시작 시 및 주기적으로 업데이트 확인

**Acceptance Criteria:**
- [ ] src-tauri/src/updater.rs 생성
- [ ] check_for_updates() 함수 구현
- [ ] 앱 시작 후 5초 뒤 첫 체크
- [ ] 이후 6시간마다 체크
- [ ] 체크 실패 시 조용히 무시

---

#### E4-S3: 업데이트 알림 UI
**Priority:** P0

**설명:**
새 버전 발견 시 사용자에게 알림 표시

**Acceptance Criteria:**
- [ ] 업데이트 가능 시 알림 다이얼로그 표시
- [ ] 버전 번호와 릴리즈 노트 표시
- [ ] "지금 업데이트" / "나중에" / "이 버전 건너뛰기" 옵션
- [ ] 사용자 선택 저장

---

#### E4-S4: 업데이트 다운로드 및 설치
**Priority:** P0

**설명:**
업데이트 다운로드 및 설치 진행

**Acceptance Criteria:**
- [ ] install_update() 함수 구현
- [ ] 다운로드 진행률 표시
- [ ] 서명 검증 수행
- [ ] 설치 완료 후 자동 재시작
- [ ] 설치 실패 시 롤백

---

#### E4-S5: Frontend 업데이트 UI
**Priority:** P0

**설명:**
Frontend에서 업데이트 상태를 표시하는 UI

**Acceptance Criteria:**
- [ ] 업데이트 알림 컴포넌트 생성
- [ ] 다운로드 진행률 바
- [ ] 업데이트 완료/실패 메시지
- [ ] 설정에서 자동 업데이트 on/off

---

#### E4-S6: 업데이트 서명 키 생성
**Priority:** P0

**설명:**
업데이트 바이너리 서명을 위한 Ed25519 키페어 생성

**Acceptance Criteria:**
- [ ] `tauri signer generate` 실행
- [ ] private key를 GitHub Secrets에 저장
- [ ] public key를 tauri.conf.json에 추가
- [ ] 키 백업 안전하게 보관

---

## Epic 5: 플랫폼별 인스톨러

**목표:** macOS, Windows, Linux용 인스톨러 생성

**FR Coverage:** FR1, FR2, FR6
**NFR Coverage:** NFR-P2

### Stories

#### E5-S1: macOS DMG 인스톨러 설정
**Priority:** P0

**설명:**
macOS용 DMG 인스톨러 구성

**Acceptance Criteria:**
- [ ] tauri.conf.json에 macOS bundle 설정
- [ ] DMG 배경 이미지 생성
- [ ] 앱을 Applications로 드래그하는 가이드
- [ ] Universal binary (x64 + ARM64) 생성

---

#### E5-S2: Windows NSIS 인스톨러 설정
**Priority:** P0

**설명:**
Windows용 NSIS 인스톨러 구성

**Acceptance Criteria:**
- [ ] tauri.conf.json에 Windows NSIS 설정
- [ ] 인스톨러 아이콘 설정
- [ ] 시작 메뉴 바로가기 생성
- [ ] 언인스톨러 포함
- [ ] 설치 경로 선택 옵션

---

#### E5-S3: Linux AppImage 설정
**Priority:** P0

**설명:**
Linux용 AppImage 생성

**Acceptance Criteria:**
- [ ] tauri.conf.json에 AppImage 설정
- [ ] .desktop 파일 생성
- [ ] 아이콘 번들링
- [ ] x64 및 ARM64 빌드

---

#### E5-S4: 인스톨러 테스트
**Priority:** P0

**설명:**
각 플랫폼에서 인스톨러 테스트

**Acceptance Criteria:**
- [ ] macOS: DMG 마운트 → 앱 설치 → 실행 → 제거
- [ ] Windows: EXE 실행 → 설치 → 실행 → 제거
- [ ] Linux: AppImage 실행 권한 → 실행
- [ ] 각 플랫폼에서 기존 데이터 유지 확인

---

## Epic 6: CI/CD 파이프라인

**목표:** GitHub Actions로 멀티플랫폼 자동 빌드 및 릴리즈

**FR Coverage:** FR26
**NFR Coverage:** NFR-M1, NFR-M2

### Stories

#### E6-S1: PR 빌드 워크플로우
**Priority:** P0

**설명:**
PR마다 빌드 검증하는 워크플로우

**Acceptance Criteria:**
- [ ] .github/workflows/build.yml 생성
- [ ] macOS, Windows, Linux 매트릭스 빌드
- [ ] cargo clippy, cargo test 실행
- [ ] frontend lint, type check 실행
- [ ] Tauri 빌드 (서명 없이)

---

#### E6-S2: 릴리즈 워크플로우
**Priority:** P0

**설명:**
태그 푸시 시 자동 릴리즈하는 워크플로우

**Acceptance Criteria:**
- [ ] .github/workflows/release.yml 생성
- [ ] v* 태그에서 트리거
- [ ] 6개 타겟 빌드 (macOS x2, Windows x2, Linux x2)
- [ ] GitHub Release 생성
- [ ] 릴리즈 노트 자동 생성

---

#### E6-S3: 아티팩트 업로드 설정
**Priority:** P0

**설명:**
빌드 결과물을 GitHub Release에 업로드

**Acceptance Criteria:**
- [ ] DMG, EXE, AppImage 업로드
- [ ] latest.json (업데이트 매니페스트) 생성 및 업로드
- [ ] 체크섬 파일 생성
- [ ] 아티팩트 이름 규칙 통일

---

#### E6-S4: 의존성 취약점 스캔
**Priority:** P1

**설명:**
cargo audit으로 의존성 취약점 검사

**Acceptance Criteria:**
- [ ] cargo audit CI 단계 추가
- [ ] 취약점 발견 시 빌드 실패
- [ ] 주간 스케줄 스캔 추가
- [ ] npm audit도 추가

---

#### E6-S5: 캐싱 최적화
**Priority:** P1

**설명:**
CI 빌드 시간 단축을 위한 캐싱

**Acceptance Criteria:**
- [ ] Rust 컴파일 캐시 (sccache)
- [ ] Cargo 의존성 캐시
- [ ] Node modules 캐시
- [ ] 빌드 시간 50% 이상 단축

---

## Epic 7: 코드 서명

**목표:** 모든 플랫폼에서 코드 서명하여 보안 경고 제거

**FR Coverage:** FR2
**NFR Coverage:** NFR-S1, NFR-S2, NFR-S3

### Stories

#### E7-S1: macOS Developer ID 설정
**Priority:** P0

**설명:**
Apple Developer ID로 macOS 앱 서명

**Acceptance Criteria:**
- [ ] Apple Developer 계정 등록 ($99)
- [ ] Developer ID Application 인증서 생성
- [ ] 인증서를 GitHub Secrets에 저장
- [ ] CI에서 코드 서명 단계 추가

**Secrets Required:**
- APPLE_CERTIFICATE (base64)
- APPLE_CERTIFICATE_PASSWORD
- APPLE_SIGNING_IDENTITY

---

#### E7-S2: macOS Notarization 설정
**Priority:** P0

**설명:**
Apple Notarization으로 Gatekeeper 통과

**Acceptance Criteria:**
- [ ] App-specific password 생성
- [ ] notarytool로 앱 제출
- [ ] Notarization 완료 대기
- [ ] stapler로 티켓 첨부
- [ ] CI 자동화

**Secrets Required:**
- APPLE_ID
- APPLE_PASSWORD (app-specific)
- APPLE_TEAM_ID

---

#### E7-S3: Windows EV 코드 서명
**Priority:** P0

**설명:**
EV 인증서로 Windows 앱 서명

**Acceptance Criteria:**
- [ ] EV Code Signing 인증서 구매
- [ ] Azure Key Vault에 인증서 저장 (또는 HSM)
- [ ] CI에서 signtool 서명 단계 추가
- [ ] SmartScreen 경고 없음 확인

**Secrets Required:**
- AZURE_KEY_VAULT_URI
- AZURE_CLIENT_ID
- AZURE_CLIENT_SECRET
- AZURE_CERT_NAME

---

#### E7-S4: 서명 검증 테스트
**Priority:** P0

**설명:**
각 플랫폼에서 서명 검증

**Acceptance Criteria:**
- [ ] macOS: `codesign -v` 검증 통과
- [ ] macOS: `spctl --assess` 통과
- [ ] Windows: 속성에서 "디지털 서명" 탭 확인
- [ ] Windows: SmartScreen 경고 없음
- [ ] 신규 설치 테스트 (clean machine)

---

## Epic 8: 시스템 트레이 (Growth)

**목표:** 시스템 트레이 아이콘 및 백그라운드 실행

**FR Coverage:** FR19, FR20, FR21, FR22
**Priority:** P1 (Growth)

### Stories

#### E8-S1: 트레이 아이콘 구현
**Priority:** P1

**설명:**
시스템 트레이에 앱 아이콘 표시

**Acceptance Criteria:**
- [ ] src-tauri/src/tray.rs 생성
- [ ] 트레이 아이콘 설정
- [ ] 앱 실행 중 트레이 아이콘 표시
- [ ] 아이콘 상태 표시 (연결됨/끊김)

---

#### E8-S2: 트레이 메뉴 구현
**Priority:** P1

**설명:**
트레이 아이콘 우클릭 메뉴

**Acceptance Criteria:**
- [ ] 컨텍스트 메뉴 생성
- [ ] "열기" - 창 표시
- [ ] "업데이트 확인" - 수동 업데이트 체크
- [ ] "종료" - 앱 완전 종료

---

#### E8-S3: 백그라운드 실행
**Priority:** P1

**설명:**
창을 닫아도 앱이 백그라운드에서 실행

**Acceptance Criteria:**
- [ ] 창 닫기 버튼이 숨기기로 동작
- [ ] 트레이 아이콘 클릭으로 창 토글
- [ ] "종료" 메뉴로만 완전 종료
- [ ] 설정에서 동작 변경 가능

---

#### E8-S4: 시작 시 자동 실행
**Priority:** P1

**설명:**
OS 부팅 시 앱 자동 시작

**Acceptance Criteria:**
- [ ] tauri-plugin-autostart 설치
- [ ] 설정에서 자동 시작 on/off
- [ ] 자동 시작 시 트레이로만 시작 옵션
- [ ] 각 플랫폼 테스트

---

## Story Dependencies

```
E1-S1 (Tauri init)
  └── E1-S2 (Plugins)
        └── E1-S3 (Icons)
              └── E1-S4 (Frontend)
                    └── E2-S1 (Sidecar setup)
                          └── E2-S2 (Start)
                                └── E2-S3 (Stop)
                                      └── E2-S4 (Monitor)
                                            └── E2-S5 (Port IPC)

E1-S2 (Plugins)
  └── E3-S1 (keyring)
        └── E3-S2 (Commands)
              └── E3-S3 (Frontend util)
                    └── E3-S4 (Migration)
                          └── E3-S5 (Auth flow)

E1-S2 (Plugins)
  └── E4-S6 (Keys)
        └── E4-S1 (Updater config)
              └── E4-S2 (Check logic)
                    └── E4-S3 (Notification)
                          └── E4-S4 (Install)
                                └── E4-S5 (UI)

E2-S5 (Port IPC) + E3-S5 (Auth) + E4-S4 (Updater)
  └── E5-S1, S2, S3 (Installers)
        └── E5-S4 (Test)

E5-S4 (Installer test)
  └── E6-S1 (PR workflow)
        └── E6-S2 (Release workflow)
              └── E6-S3 (Artifacts)

E6-S2 (Release workflow)
  └── E7-S1 (macOS sign)
        └── E7-S2 (Notarization)
  └── E7-S3 (Windows sign)
        └── E7-S4 (Verify)
```

---

## Sprint Suggestion

### Sprint 1: 기초 (E1 + E2)
- E1-S1, E1-S2, E1-S3, E1-S4
- E2-S1, E2-S2, E2-S3, E2-S4, E2-S5

**목표:** Tauri 앱이 sidecar와 함께 로컬에서 실행

---

### Sprint 2: 보안 (E3)
- E3-S1, E3-S2, E3-S3, E3-S4, E3-S5

**목표:** 인증 정보가 OS Keychain에 저장

---

### Sprint 3: 업데이트 + 인스톨러 (E4 + E5)
- E4-S1, E4-S2, E4-S3, E4-S4, E4-S5, E4-S6
- E5-S1, E5-S2, E5-S3, E5-S4

**목표:** 자동 업데이트 작동, 인스톨러 생성

---

### Sprint 4: CI/CD + 코드 서명 (E6 + E7)
- E6-S1, E6-S2, E6-S3, E6-S4, E6-S5
- E7-S1, E7-S2, E7-S3, E7-S4

**목표:** 자동화된 서명된 릴리즈

---

### Sprint 5: Growth (E8)
- E8-S1, E8-S2, E8-S3, E8-S4

**목표:** 시스템 트레이 및 백그라운드 실행

---

## Acceptance Criteria Summary

| Epic | Total Stories | P0 | P1 |
|------|---------------|----|----|
| E1 | 4 | 4 | 0 |
| E2 | 5 | 5 | 0 |
| E3 | 5 | 5 | 0 |
| E4 | 6 | 6 | 0 |
| E5 | 4 | 4 | 0 |
| E6 | 5 | 3 | 2 |
| E7 | 4 | 4 | 0 |
| E8 | 4 | 0 | 4 |
| **Total** | **37** | **31** | **6** |

---

_Generated by BMAD Epic Decomposition Workflow_
_Date: 2025-11-25_
_Source: PRD + Architecture_
