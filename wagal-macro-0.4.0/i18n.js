(function(root){
  const pairs={
    attemptHint:['0 = 횟수 무제한 (성공할 때까지 반복)','0 = unlimited attempts (repeats until success)'],jitter:['랜덤 간격 활성화 (±1~2초)','Enable random interval (±1~2s)'],jitterHint:['설정 간격에 자연스러운 오차(±1~2초)를 주어 봇 감지를 우회합니다. 끄면 설정한 초 그대로 고정됩니다.','Adds natural variation (±1~2s) to bypass bot filters.'],reload:['페이지 새로고침','Reload page'],
    testMode:['테스트','TEST'],openTest:['테스트 페이지 열기','Open test page'],testHelp:['start-test.cmd를 먼저 실행하세요. 실제 결제는 없습니다.','Run start-test.cmd first. No real payments are made.'],
    name:['와갈매크로','Wagal Macro'],run:['실행','Run'],logs:['로그','Logs'],settings:['설정','Settings'],
    checking:['확인 중','Checking'],connected:['연결됨','Connected'],disconnected:['연결 필요','Not connected'],
    open:['Apple 열기 ↗','Open Apple ↗'],check:['화면 점검','Check page'],recheck:['다시 점검','Check again'],
    emptyProduct:['구독 화면을 점검하세요','Check your subscription page'],emptyPrice:['YouTube 구독 상세 화면에서 점검','Check the YouTube subscription details'],
    attempts:['최대 횟수','Max attempts'],delay:['간격 (초)','Interval (sec)'],
    consent:['표시된 금액으로 유료 갱신 시도에 동의','I agree to attempt a paid renewal at the shown price'],
    start:['시작','Start'],checkFirst:['점검 후 시작','Check page first'],stop:['중지','Stop'],
    history:['진행 이력','Activity history'],export:['내려받기 ↓','Export ↓'],emptyLogs:['기록 없음','No activity yet'],
    language:['표시 언어','Display language'],settingsNote:['언어는 자동 저장됩니다.','Language is saved automatically.'],
    saved:['저장됨','Saved'],saveFailed:['언어 저장 실패','Could not save language'],
    preview:['화면 미리보기 · 실행 불가','UI preview · Actions disabled'],
    pageRequired:['Apple 구독 페이지를 열어주세요.','Open your Apple subscriptions page.'],
    reconnect:['Apple 페이지를 새로고침하고 다시 점검하세요.','Reload the Apple page, then check again.'],
    next:['다음 시도까지 {seconds}초','Next attempt in {seconds}s'],count:['/ {max}회','/ {max} attempts'],
    overlayCount:['{count} / {max}회','{count} / {max} attempts'],
    idle:['준비','Ready'],starting:['시작 중','Starting'],running:['실행 중','Running'],waiting:['대기 중','Waiting'],
    success:['갱신 확인','Renewal detected'],review:['확인 필요','Review needed'],limit:['한도 도달','Limit reached'],stopped:['중지됨','Stopped'],
    readyBadge:['점검 완료','Ready'],readyTitle:['갱신 준비 완료','Ready to renew'],readyDetail:['상품·금액을 확인하고 시작하세요.','Verify the product and price before starting.'],
    activeBadge:['구독 활성','Active'],activeTitle:['이미 활성화된 구독입니다','Subscription already active'],activeDetail:['추가 갱신 시도가 필요하지 않습니다.','No additional renewal attempt is needed.'],
    listBadge:['상세 화면 필요','Open details'],listTitle:['구독 상세 화면을 열어주세요','Open subscription details'],listDetail:['YouTube 카드를 누르고 Renew 화면에서 다시 점검하세요.','Select the YouTube card, then check the page with the Renew button.'],
    confirmBadge:['확인창 열림','Confirmation open'],confirmTitle:['확인창을 닫아주세요','Close the confirmation dialog'],confirmDetail:['Renew 화면으로 돌아와 다시 점검하세요.','Return to the Renew page and check again.'],
    errorBadge:['결제 오류','Payment error'],errorTitle:['결제 오류를 확인하세요','Review the payment error'],errorDetail:['Apple에서 결과를 확인한 뒤 다시 점검하세요.','Check the result on Apple before checking again.'],
    authBadge:['인증 필요','Sign-in required'],authTitle:['Apple 인증을 완료하세요','Complete Apple sign-in'],authDetail:['로그인 또는 인증 후 다시 점검하세요.','Sign in or verify your account, then check again.'],
    ambiguousBadge:['대상 확인 필요','Select a subscription'],ambiguousTitle:['구독 하나를 선택하세요','Select one subscription'],ambiguousDetail:['YouTube 구독 상세 화면 하나만 열어주세요.','Open a single YouTube subscription detail page.'],
    unknownBadge:['확인 필요','Review needed'],unknownTitle:['화면을 인식하지 못했습니다','Page not recognized'],unknownDetail:['YouTube 상세 화면에서 다시 점검하세요.','Check again on the YouTube subscription details page.']
  };
  const strings={ko:{},en:{}};for(const [key,values] of Object.entries(pairs)){strings.ko[key]=values[0];strings.en[key]=values[1];}
  const messages={
    '횟수 0–500, 대기 5–300초, 랜덤 0–60초, 시간 1–120분을 입력하세요.':'Enter 0–500 attempts, a 5–300 second interval, 0–60 seconds of randomness, and a 1–120 minute limit.',
    '이미 실행 중입니다.':'A run is already in progress.',
    '상품과 금액을 확인할 수 있는 구독 화면부터 시작하세요.':'Start from a subscription page with an identifiable product and price.',
    '구독 화면을 점검해 주세요.':'Check the subscription page.',
    '사용자가 중지했습니다. 전송된 결제 요청은 취소되지 않으므로 구독 상태를 확인하세요.':'Stopped. Already submitted payment requests cannot be canceled; check your subscription.',
    '설정한 실행 시간이 끝났습니다. 구독 상태를 확인하세요.':'Time limit reached. Check your subscription status.',
    '구독 화면을 확인하고 있습니다.':'Checking the subscription page.',
    '실행 시간 제한에 도달했습니다.':'Time limit reached.',
    '화면 응답 대기 시간이 지났습니다. 구독 상태를 직접 확인하세요.':'Page response timed out. Check the subscription status on Apple.',
    '구독 화면의 실행 위치가 변경되어 중지했습니다. 다시 점검해 주세요.':'The subscription frame changed. Stopped; check the page again.',
    '대상 구독의 활성 상태와 갱신일을 확인했습니다. Apple 결제 내역도 확인하세요.':'Active subscription and renewal date detected. Verify your Apple purchase history.',
    '활성 구독 화면입니다. 이번 실행의 갱신 결과인지는 확인해 주세요.':'An active subscription is visible. Verify whether this run renewed it.',
    '화면을 확실히 판별할 수 없습니다. Apple 화면을 직접 확인해 주세요.':'The page is unclear. Review the Apple page before continuing.',
    '설정한 시도 횟수에 도달했습니다.':'Attempt limit reached.',
    '오류창을 닫았습니다. 다음 시도까지 기다립니다.':'Error dismissed. Waiting before the next attempt.',
    '상품 또는 금액이 처음 확인한 내용과 달라 중지했습니다.':'Stopped because the product or price changed.',
    '클릭 직전 화면이 변경되었습니다. 다시 점검해 주세요.':'The page changed before the click. Check it again.',
    '갱신 확인창을 기다리고 있습니다.':'Waiting for the renewal confirmation.',
    '결제 결과를 기다립니다. 확인 버튼을 다시 누르지 않습니다.':'Waiting for the payment result. Confirm will not be clicked again.',
    '결제 오류창을 닫았습니다. 구독 확인창을 정리합니다.':'Payment error dismissed. Closing the confirmation dialog.',
    '구독 화면으로 돌아가는 중입니다.':'Returning to the subscription page.',
    '30초 동안 다음 화면을 확인하지 못했습니다. 결제 결과를 직접 확인하세요.':'No next screen detected within 30 seconds. Verify the payment result.',
    '페이지 연결이 끊겼습니다. 구독 상태를 확인하고 다시 점검하세요.':'Page connection lost. Verify the subscription and check again.',
    '실행 중에는 다시 점검할 수 없습니다.':'Stop the current run before checking again.',
    '화면 점검을 다시 실행해 주세요. 점검은 1분간 유효합니다.':'Check the page again. A check is valid for one minute.',
    '표시된 상품과 금액의 갱신 시도에 동의해 주세요.':'Confirm your consent to attempt renewal at the displayed product and price.',
    '다른 실행이 진행 중입니다. 실행 탭에서 중지해 주세요.':'Another tab is running. Stop it in that tab first.',
    '점검 후 상품 화면이 변경되었습니다. 다시 점검해 주세요.':'The subscription changed after inspection. Check it again.',
    '알 수 없는 요청입니다.':'Unknown request.',
    '허용되지 않은 페이지입니다.':'This page is not supported.'
  };
  const normalize=language=>String(language||'').toLowerCase().startsWith('ko')?'ko':'en';
  const t=(key,language,params={})=>(strings[normalize(language)][key]||key).replace(/\{(\w+)\}/g,(_,name)=>String(params[name]??''));
  const message=(text,language)=>normalize(language)==='ko'?text:messages[text]||text;
  root.WagalI18n={strings,normalize,t,message};if(typeof module!=='undefined')module.exports=root.WagalI18n;
})(globalThis);
