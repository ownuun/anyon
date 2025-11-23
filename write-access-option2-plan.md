# 작성 권한 열기 플랜 (옵션 2)

- 목표: 프로젝트 루트가 그대로 `/Users/cosmos/Documents/dev/test`인 상태에서, IDE처럼 백엔드가 `anyon-docs` 폴더에 직접 쓰도록 권한을 열어 500 오류를 없앤다.
- 범위: 문서 API 코드 변경 없음. 실행/권한 설정으로만 해결.

## 1) 대상 확인
- 프로젝트 ID: `44a5c5f1-e5b7-4205-949f-b7338a58e14d`
- 문서 경로: `/Users/cosmos/Documents/dev/test/anyon-docs/conversation/*.md`
- 해당 오류 문서: ID `3d6fbfff-5866-5498-9854-6658ffbf6f3d` → 파일 `prd.md`

## 2) 경로 쓰기 권한 열기
- macOS 설정 → 개인정보 보호 및 보안 → 전체 디스크 접근(또는 파일 및 폴더)에서 사용하는 터미널/IDE 앱에 `/Users/cosmos/Documents/dev/test/anyon-docs` 접근을 허용한다.  
  - 필요 시 터미널/IDE를 재시작.
- 파일 권한 점검: `ls -l /Users/cosmos/Documents/dev/test/anyon-docs/conversation`로 소유자/퍼미션 확인.  
  - 소유자가 본인인데도 쓰기 불가하면 `chmod u+w /Users/cosmos/Documents/dev/test/anyon-docs/conversation` (또는 개별 md 파일)로 사용자 쓰기 권한을 준다.
- 샌드박스/런처가 외부 경로 쓰기를 막고 있다면, 백엔드를 샌드박스 밖에서 실행하도록 설정한다.

## 3) 백엔드 실행 (권한 열린 상태)
- 명령 예시:  
  `BACKEND_PORT=3001 RUST_LOG=debug cargo run -p server --bin server`
- 기대: 포트 3001 바인딩, 권한 에러 없이 기동.

## 4) 문서 업데이트 수동 검증
- curl로 PUT 테스트:  
  `curl -X PUT http://localhost:3001/api/projects/44a5c5f1-e5b7-4205-949f-b7338a58e14d/documents/3d6fbfff-5866-5498-9854-6658ffbf6f3d -H "Content-Type: application/json" -d '{"content":"ping"}'`
- 기대: HTTP 200, 디스크의 `prd.md` 내용이 `ping`으로 변경.

## 5) 프론트엔드 플로우 확인
- `pnpm run frontend:dev` (또는 `pnpm run dev`) 실행.
- 기획 탭 → 대화 탭 오른쪽 문서 영역에서 PRD 열기 → 수정 → 저장.  
  - 500 없고, 저장 후 실제 파일 내용이 반영되는지 확인.

## 6) 실패 시 대안
- 권한을 열 수 없으면:  
  1) 프로젝트 루트를 현재 작업 워크스페이스(`/Users/cosmos/Documents/anyon-mvp`)로 맞추거나,  
  2) 문서 저장 위치를 앱 소유 경로(예: `asset_dir()/anyon-docs/<project_id>`)로 리팩터링.  
  권한 방식이 최우선이면 상단 단계를 재확인.

## 7) 예상 유저 플로우 예시
1) 권한 부여  
   - macOS 설정에서 터미널/IDE에 `/Users/cosmos/Documents/dev/test/anyon-docs` 접근 허용 → 터미널/IDE 재시작.  
   - 필요 시 `chmod u+w /Users/cosmos/Documents/dev/test/anyon-docs/conversation`로 사용자 쓰기 권한 추가.
2) 서버/프론트 실행  
   - 터미널 1: `BACKEND_PORT=3001 RUST_LOG=debug cargo run -p server --bin server`  
   - 터미널 2: `pnpm run frontend:dev` (또는 `pnpm run dev`)
3) 문서 수정  
   - 브라우저에서 기획 탭 → 대화 탭 → 오른쪽 문서 영역 열기.  
   - PRD 탭 선택 → 내용 편집 → Save 클릭.
4) 결과 확인  
   - 브라우저: 500 에러 없이 “Saved” 토스트.  
   - 파일: `/Users/cosmos/Documents/dev/test/anyon-docs/conversation/prd.md` 내용이 반영됨(필요 시 에디터에서 열어 확인).  
   - 로그: 백엔드 콘솔에 권한/IO 에러 없이 정상 처리.
