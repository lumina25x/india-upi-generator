# 와갈매크로 0.4.5 검증 — 2026-10-13

원본은 최신 UI와 가이드/후기 기능을 유지한 0.4.4. 사용자 제공 apple-renew-macro 폴더를 읽기 전용으로 분석했다. 참고 프로그램은 단계별로 allFrames를 검사하고 대상 frameIds 한 곳에서 클릭한다. 코드를 통째로 복제하지 않고 와갈매크로의 상품/금액 검증과 중복 대상 차단을 유지하는 자체 라우터를 구현했다.

확정 원인: 실제 사용자 로그에서 Renew는 프레임1024, Confirm은 프레임1027에 나타났으며 부모1024의 ambiguous와 합쳐 multiple-frames로 종료됨. 기존 처음 프레임 고정과 모든 상태 병합이 문제였다.

변경:
- frame-router.js: 단계별 프레임 선택. confirm 단계의 유일한 확인창에서 상품/금액 일치 시 실행 인계. 배경 부모의 제품 목록 중복과 활성 확인창을 구분한다.
- background.js: 실행 잠금에 원래/현재/확인 프레임 및 단계 저장. 클릭 전 재탐색/상품/금액/토큰/단계를 재확인. 반복 Confirm 및 잘못된 프레임 요청 차단.
- 오류 프레임 Cancel → 확인 프레임 Cancel → 원래 Renew 프레임 복귀. Confirm 직접 시작의 경우 정확히 일치하는 단일 복귀 화면을 발견한 뒤 고정.
- 중지 요청은 비동기 검사 완료를 기다리지 않고 토큰을 무효화. 이미 브라우저에 전송한 클릭을 되돌리는 기능은 아님.
- UI와 설정·가이드·후기·페이지 인식 코드는 버전 변경 외 유지.

검증 38개 통과:
- node --test reports/routing-045.test.cjs reports/lease-045.test.cjs reports/loading-045.test.cjs reports/blank-dialog-045.test.cjs reports/ambiguous-045.test.cjs : 21개
- node reports/blank-dialog-045-dom.cjs : 2개
- node reports/cross-frame-045.cjs : 실제 설치형 교차 출처 프레임 6개
- node reports/final-045-browser.cjs : 최신 UI/통합 9개

교차 프레임 시험: account.apple.com 최상위, apps.apple.com Renew, buy.itunes.apple.com 새 Confirm 및 별도 오류 iframe. 모든 HTTP 응답은 로컬 모의 HTML로 대체했다. Renew2/Confirm2/오류Cancel1/확인Cancel1 후 모의 성공. 직접 Confirm 시작 후 오류·복귀·재시도 성공 및 두 Confirm 프레임 동시 존재 시 0회 클릭을 검증했다.

독립 코드 리뷰의 중지 경쟁 상태와 직접 Confirm 시작 시 복귀 프레임 누락을 회귀 재현·수정 후 재검토했다. 남은 P1/P2 지적 없음. 문법 검사 통과.

증거: reports/cross-frame-045-result.json, cross-frame-045-output.txt, cross-frame-045-success.png, final-045-browser-output.txt. 실제 Apple 로그인·결제·갱신 및 외부 후기 제출은 수행하지 않았다. 실서비스 최종 해결 확인은 아직 필요하다.