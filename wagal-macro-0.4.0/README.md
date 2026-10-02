# 와갈매크로 / Wagal Macro 0.4.0

Apple 구독 페이지의 점검과 제한된 갱신 시도를 돕는 로컬 확장 프로그램입니다. 이전 이름은 Renew Studio이며, 개발 폴더 이름은 기존 설치 경로 보존을 위해 `renew-studio`로 유지합니다.

## 설치 / 업데이트

1. 기존 갱신 매크로를 끕니다. 다른 확장 프로그램의 동시 실행은 이 도구가 막을 수 없습니다.
2. `wagal-macro-0.4.0.zip`을 풉니다.
3. `chrome://extensions` 또는 `edge://extensions`에서 개발자 모드를 켜고 **압축해제된 확장 프로그램 로드**로 `manifest.json`이 있는 폴더를 선택합니다.
4. 기존에 설치한 동일 폴더의 파일을 교체했다면, 확장 관리 화면에서 해당 확장의 **새로고침(⟳)**을 누릅니다.
5. **Apple 페이지도 새로고침**합니다. 구버전의 페이지 스크립트가 남아 있으면 새 UI와 통신이 맞지 않을 수 있습니다.
6. 직접 로그인한 Apple 구독 화면에서 **화면 점검**을 누릅니다.

## 로컬 테스트 페이지

이미 갱신된 계정을 바꾸지 않고 실험할 수 있습니다. 첨부 화면의 레이아웃과 창 전환을 재현했으며, 실제 Apple의 내부 DOM·서버 동작을 복제한 것은 아닙니다.

1. 압축을 푼 폴더에서 **`start-test.cmd`를 더블클릭**합니다. Node.js가 필요하며 현재 개발 PC에는 설치되어 있습니다. 창을 열어 둡니다.
2. 자동으로 열리는 브라우저가 다른 브라우저라면, 확장 프로그램을 설치한 Chrome/Edge에서 `http://127.0.0.1:18741/wagal-test/`를 엽니다. 설정 탭의 **테스트 페이지 열기**로도 이동할 수 있습니다.
3. 페이지 상단에서 **오류 후 성공 / 오류 횟수 2 / 응답 지연 600ms → 적용 / 초기화**를 선택합니다.
4. 확장 프로그램에서 **화면 점검 → 최대 횟수 5, 간격 5초 → 동의 → 시작**을 누릅니다. 확장 헤더에 **테스트**가 표시되는지 확인합니다.
5. Renew → Confirm → 오류창 Cancel → 확인창 Cancel이 두 번 반복된 뒤 세 번째에 모의 활성 화면이 나타납니다. 확장 로그와 페이지 하단의 클릭 횟수를 함께 확인합니다.
6. 다른 시나리오를 고른 뒤 **적용 / 초기화**하면 현재 실행과 페이지 이력이 초기화됩니다. 서버 창을 닫거나 Ctrl+C를 누르면 테스트 서버가 종료됩니다.

| 시나리오 | 확인할 동작 |
| --- | --- |
| 오류 후 성공 | 지정 횟수만큼 오류 후 성공, 두 Cancel 분리 |
| 계속 결제 오류 | 최대 시도 횟수에서 중지 |
| 느린 응답 후 성공 | 응답 대기 중 Confirm 재클릭 없음 |
| 응답 없음 | 수동 중지 및 응답 시간 초과 처리 |
| 확인창 금액 변경 | 변경된 금액을 확인하면 Confirm 전에 중지 |
| 알 수 없는 창 | 자동 진행하지 않고 확인 필요로 중지 |
| 이미 활성화됨 | 활성 구독 안내, 새 실행 차단 |

테스트 페이지는 127.0.0.1에만 바인딩하며 Apple에 요청하지 않습니다. 데모 계정만 표시하고 로그인·결제정보를 받지 않습니다. 확장은 **정확한 포트 18741과 `/wagal-test/` 경로**에서만 테스트 모드로 실행하며, 내보낸 JSON에도 `simulation: true`가 기록됩니다. Chrome의 호스트 권한 표시는 `http://127.0.0.1/*`이지만 다른 로컬 주소·경로는 실행 대상 검사에서 거부합니다. 포트가 이미 사용 중이면 기존 테스트 서버를 확인해 주세요.

## 화면

- **실행:** 구독 상태, 상품·금액, 최대 횟수, 간격, 시작/중지. 큰 소개 문구를 제거하고 380px 폭으로 줄였습니다.
- **로그:** 현재 실행의 최근 200개 기록을 최신순으로 표시합니다. 내려받기는 JSON 파일입니다. 팝업을 닫아도 같은 탭의 기록이 유지되지만 Apple 탭을 새로고침하거나 닫으면 사라집니다.
- **설정:** 한국어 / English 선택과 실행 시간 제한. 언어는 자동 저장되며 버튼, 상태 안내, 진행 로그, 페이지의 중지 패널에 적용됩니다. 최초 언어는 브라우저가 한국어이면 한국어, 그 외에는 영어입니다.

## 점검 결과

- **구독 활성:** 대상 카드의 갱신일이 보이면 이미 활성화된 구독으로 안내합니다. 추가 갱신을 시작하지 않습니다. 도구가 결제에 성공했다는 뜻은 아닙니다.
- **상세 화면 필요:** YouTube 카드를 직접 눌러 Renew 버튼이 있는 상세 화면으로 이동한 뒤 다시 점검합니다.
- **점검 완료:** 상품·금액을 확인하고 유료 갱신 시도에 동의한 뒤 시작할 수 있습니다.
- **확인 필요:** 화면을 확실하게 인식하지 못해 실행하지 않습니다.

분리된 `YouTube` / `Premium` 제목, `Renews 1 November`와 `Renews on …`, 중첩된 카드 제목을 인식하도록 보완했습니다. 다른 카드의 날짜나 금액을 가져와 결합하지 않도록 회귀 테스트를 추가했습니다.

## 실행 범위

기본 최대 5회, 간격 30±5초, 총 10분입니다. 최대 횟수 0은 횟수 무제한이며 시간 제한은 계속 적용됩니다. 허용 범위는 0–500회, 기준 간격 5–300초, 랜덤 ±0–60초, 시간 1–120분입니다. 설정의 랜덤 간격 기본값은 ±5초이며 0이면 고정 간격입니다. 매 재시도마다 범위 안에서 대기 시간을 뽑고 실제 대기는 5–300초로 제한합니다. 최적 성공 간격을 의미하지 않습니다. 점검은 1분간 유효합니다.

같은 확장 내에서 한 탭·한 프레임만 실행합니다. Confirm을 보낸 후 재클릭하지 않고, 알려진 오류에서만 두 Cancel을 구분해 처리합니다. 상품/금액/프레임 변경, 인증, 불명확한 화면, 응답 시간 초과에서 멈춥니다. 자동 새로고침이나 자동 재개는 없습니다. 중지됨/확인 필요 상태의 페이지 새로고침 버튼으로 복구할 수 있으며 다시 점검하고 직접 시작해야 합니다. 새로고침하면 현재 탭의 로그가 지워지므로 필요한 이력은 먼저 내려받으세요. 중지는 이미 전송한 결제 요청을 취소하지 않습니다.

**표시 언어와 Apple 화면 인식은 별개입니다.** 현재 대상은 영어/일부 한국어 YouTube Premium 및 Family 화면과 INR 금액입니다. 영어 UI를 선택한다고 다른 국가·통화·모든 Apple 언어에서 동작하는 것은 아닙니다.

## 개인정보 / 검증 범위

비밀번호·쿠키·결제수단·페이지 전문을 수집하거나 외부 서버로 보내지 않습니다. 언어만 로컬 저장소에, 실행 잠금은 세션 저장소에 보관합니다. 상품·금액과 실행 이력은 탭 메모리에 있습니다. 진단 JSON은 버전·표시 언어·상태·시도 횟수·시각·고정 안내 문구를 포함하며 상품·계정 정보는 제외합니다.

권한은 `activeTab`, `scripting`, `storage`입니다. 접근 호스트는 `account.apple.com`, `*.itunes.apple.com`, `apps.apple.com` 및 로컬 실험용 `127.0.0.1`입니다. 실제 계정은 Apple에서 직접 로그인합니다.

테스트는 사용자 캡처 형태를 재현한 HTML과 모의 페이지를 사용했습니다. 실제 설치한 MV3 확장의 메시지·교차 출처 iframe·중지·언어 저장도 검증했지만 **실제 Apple DOM, 실제 결제·갱신, YouTube 활성화, Edge 설치, 장시간 백그라운드/절전, 공개 배포는 미검증**입니다. 결제나 계정 상태를 바꿔서 시험하지 않았습니다. 검증 세부사항은 `VALIDATION.md`에 있습니다.

## English quick start

1. Disable other renewal macros. Unzip `wagal-macro-0.4.0.zip`.
2. Enable Developer mode at `chrome://extensions` and choose **Load unpacked**. Select the folder containing `manifest.json`.
3. For an update in the same folder, click **Reload** on the extension. Then reload the Apple tab too.
4. Open the extension → **Settings → Display language → English**. The selection is saved locally.
5. Use **Check page**. An active subscription requires no extra renewal attempt. For a subscription list, open the YouTube card yourself and check again on the Renew page.
6. Review the product, price and limits before consenting to a paid renewal attempt. Use **Logs** for history and export.

Attempts: 0 means unlimited attempts; the time limit still applies. The default retry interval is 30±5 seconds. Settings lets you change the random range (0 means fixed); actual waits stay within 5–300 seconds. Stopped/review states offer Reload page, which clears this tab history and never resumes automatically. Export logs first if needed. Random timing is not proven to prevent Apple errors.

Only the interface language changes. The page adapter currently supports English/some Korean YouTube Premium pages with INR prices; it does not provide general international payment support. All payment-flow tests use mocked Apple responses. No real purchase or renewal has been verified.

For a local simulation, run `start-test.cmd` (Node.js required), keep its window open, and visit `http://127.0.0.1:18741/wagal-test/` in the browser with the extension installed. Choose a scenario and reset, then check the page in the extension. For a quick test use five attempts and a five-second interval. The popup must show **TEST**. No Apple requests or real payments are made. Resetting reloads the simulation and stops the current run. Close the server window to stop hosting the local page.

## 개발 검증

Node 24와 테스트용 Playwright를 사용합니다. 아래 설치는 확장 실행에 필요하지 않습니다.

```powershell
npm install --prefix "$env:TEMP/renew-studio-test-tools" playwright --no-audit --no-fund
node "$env:TEMP/renew-studio-test-tools/node_modules/playwright/cli.js" install chromium
node renew-studio/tests/run-all.cjs
powershell -NoProfile -ExecutionPolicy Bypass -File renew-studio/package.ps1
```

DOM 테스트는 설치된 Chrome, 확장 통합 테스트는 Playwright Chromium의 새 임시 프로필을 사용합니다. 테스트 도구와 프로필은 배포 ZIP에 포함하지 않습니다.
