(() => {
  const environment=WagalTarget.kind(location.href);if(!environment)return;
  if(globalThis.__renewStudio)return;globalThis.__renewStudio=true;
  let token=null,starting=false,checked=null,checkTime=0,revision=0;
  let language=WagalI18n.normalize(navigator.language);
  chrome.storage.local.get('language').then(saved=>{if(saved.language)language=WagalI18n.normalize(saved.language);if(host)render(runner.state);}).catch(()=>{});
  chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&changes.language){language=WagalI18n.normalize(changes.language.newValue||navigator.language);if(host)render(runner.state);}});
  const rpc=async(type,extra={})=>{const result=await chrome.runtime.sendMessage({type,...extra});if(result?.error)throw Error(result.error);return result;};
  const runner=new RenewEngine.Runner({inspect:()=>rpc('RS_INSPECT'),act:async screen=>!!(await rpc('RS_ACT',{screen,token})).clicked,sleep:ms=>new Promise(r=>setTimeout(r,ms)),update:state=>render(state)});
  let host,ui,successModalShown=false;
  function showSuccessModal(attemptCount, product) {
    if (successModalShown) return;
    successModalShown = true;
    const modalHost = document.createElement('div');
    modalHost.id = 'wagal-success-modal-host';
    modalHost.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:2147483647;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.75);backdrop-filter:blur(4px);';
    const shadow = modalHost.attachShadow({ mode: 'closed' });
    shadow.innerHTML = `
      <style>
        :host { all: initial; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Pretendard, sans-serif; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .modal-card {
          width: 90%; max-width: 480px; background: #101d2b; border: 1.5px solid #305263; border-radius: 20px;
          padding: 24px; color: #f8fafc; box-shadow: 0 24px 60px rgba(0,0,0,0.8), 0 0 30px rgba(112,217,210,0.2);
          animation: popIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes popIn { from { transform: scale(0.92); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
        .title-group { display: flex; align-items: center; gap: 10px; }
        .badge-icon { font-size: 26px; }
        .title { font-size: 17px; font-weight: 800; color: #70d9d2; }
        .subtitle { font-size: 12.5px; color: #94a3b8; margin-top: 2px; }
        .close-btn { background: none; border: none; color: #94a3b8; font-size: 20px; cursor: pointer; padding: 4px 8px; border-radius: 6px; }
        .close-btn:hover { color: #fff; background: rgba(255,255,255,0.1); }
        .guide-box { background: rgba(56, 189, 248, 0.1); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 10px; padding: 10px 14px; font-size: 12.5px; color: #38bdf8; line-height: 1.5; margin-bottom: 14px; }
        .chip-label { font-size: 12px; font-weight: 600; color: #cbd5e1; margin-bottom: 6px; display: block; }
        .chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px; }
        .chip { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); color: #cbd5e1; padding: 5px 10px; border-radius: 999px; font-size: 11.5px; cursor: pointer; transition: all 0.15s; }
        .chip:hover, .chip.active { background: rgba(112, 217, 210, 0.2); border-color: #70d9d2; color: #70d9d2; font-weight: 700; }
        .input-row { margin-bottom: 14px; }
        .input-header { display: flex; justify-content: space-between; font-size: 11.5px; color: #94a3b8; margin-bottom: 4px; }
        input[type="text"] { width: 100%; background: #0b131e; border: 1px solid #334155; border-radius: 8px; padding: 10px 12px; color: #f8fafc; font-size: 13px; outline: none; transition: border-color 0.2s; }
        input[type="text"]:focus { border-color: #70d9d2; }
        .sponsor-box { background: rgba(254, 229, 0, 0.08); border: 1px solid rgba(254, 229, 0, 0.25); border-radius: 10px; padding: 10px 12px; margin-bottom: 16px; font-size: 11.5px; color: #fef08a; line-height: 1.45; }
        .sponsor-box strong { color: #facc15; }
        .btn-row { display: flex; gap: 8px; }
        .btn-submit { flex: 1; background: linear-gradient(135deg, #10b981, #06b6d4); color: #0b131e; font-weight: 800; font-size: 13.5px; border: none; border-radius: 10px; padding: 12px; cursor: pointer; box-shadow: 0 4px 14px rgba(6,182,212,0.4); display: flex; align-items: center; justify-content: center; gap: 6px; }
        .btn-submit:hover { opacity: 0.95; transform: translateY(-1px); }
        .btn-close { background: #1e293b; border: 1px solid #334155; color: #94a3b8; padding: 12px 16px; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; }
        .btn-close:hover { background: #334155; color: #fff; }
      </style>
      <div class="modal-card">
        <div class="header">
          <div class="title-group">
            <span class="badge-icon">🎉</span>
            <div>
              <div class="title">구독 갱신 성공! 후기 남기기</div>
              <div class="subtitle">총 <strong>${attemptCount || 1}회</strong> 시도만에 갱신에 성공했습니다!</div>
            </div>
          </div>
          <button class="close-btn" id="btnModalClose">✕</button>
        </div>

        <div class="guide-box">
          다른 이용자분들에게 도움이 되도록 <strong>성공 후기나 감사 인사</strong>를 남겨주세요!
        </div>

        <div>
          <span class="chip-label">빠른 선택 칩:</span>
          <div class="chips">
            <button type="button" class="chip active" data-text="${attemptCount || 1}회 시도만에 바로 갱신 성공했습니다! 👍">⚡ ${attemptCount || 1}회만에 성공!</button>
            <button type="button" class="chip" data-text="와갈매크로 덕분에 살았습니다 감사합니다! 🙏">🙏 덕분에 살았습니다</button>
            <button type="button" class="chip" data-text="넷뱅킹 와리가리로 바로 뚫렸어요! 🔥">🔥 넷뱅킹 와리가리 성공</button>
            <button type="button" class="chip" data-text="유튜브 앱 동기화까지 완료했습니다 📱">📱 앱 동기화 완료</button>
          </div>
        </div>

        <div class="input-row">
          <div class="input-header">
            <span>감사 인사 또는 팁 입력 (직접 수정 가능)</span>
            <span id="charCount">0/35</span>
          </div>
          <input type="text" id="memoInput" maxlength="35" value="${attemptCount || 1}회 시도만에 바로 갱신 성공했습니다! 👍">
        </div>

        <div class="sponsor-box">
          ☕ <strong>연 18만 원 절약 축하! 0원 커피 선물에 동참해 주세요</strong><br>
          후기 등록 완료 시 쿠팡 1초 방문(추가 비용 0원)으로 제작자에게 따뜻한 캔커피가 선물됩니다. 무료 유지에 큰 힘이 됩니다!
        </div>

        <div class="btn-row">
          <button class="btn-close" id="btnCancel">닫기</button>
          <button class="btn-submit" id="btnSubmit">
            <span>☕ 후기 등록 & 0원 커피 후원</span>
          </button>
        </div>
      </div>
    `;

    document.documentElement.appendChild(modalHost);

    const input = shadow.getElementById('memoInput');
    const counter = shadow.getElementById('charCount');
    const updateCount = () => { counter.textContent = `${input.value.length}/35`; };
    updateCount();
    input.addEventListener('input', updateCount);

    shadow.querySelectorAll('.chip').forEach(c => {
      c.addEventListener('click', () => {
        shadow.querySelectorAll('.chip').forEach(ch => ch.classList.remove('active'));
        c.classList.add('active');
        input.value = c.getAttribute('data-text');
        updateCount();
        input.focus();
      });
    });

    const closeModal = () => { modalHost.remove(); };
    shadow.getElementById('btnModalClose').onclick = closeModal;
    shadow.getElementById('btnCancel').onclick = closeModal;

    shadow.getElementById('btnSubmit').onclick = async () => {
      const memo = input.value.trim() || '갱신 성공 확인 완료 👍';
      try {
        fetch('https://india-upi.vercel.app/api/macro-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            attempts: attemptCount || 1,
            memo,
            version: '0.4.0',
            product: product || 'YouTube Premium',
            client_type: 'extension'
          })
        }).catch(() => {});
      } catch (e) {}

      try {
        window.open('https://link.coupang.com/a/g03lOjRufc', '_blank', 'noopener,noreferrer');
      } catch (e) {}

      shadow.getElementById('btnSubmit').textContent = '✅ 등록 완료! 감사합니다';
      setTimeout(closeModal, 1200);
    };
  }

  function render(state){
    if(!host){host=document.createElement('div');host.id='renew-studio-panel';host.style.cssText='position:fixed;right:20px;bottom:20px;z-index:2147483647';const shadow=host.attachShadow({mode:'closed'});shadow.innerHTML='<style>:host{all:initial}section{width:286px;padding:20px;border:1px solid #305263;border-radius:18px;background:#101d2b;color:#eef7fc;font:14px system-ui;box-shadow:0 12px 40px #0005}small{color:#70d9d2;letter-spacing:2px}p{line-height:1.6}button{border:0;border-radius:8px;padding:10px 14px;background:#70d9d2;color:#10222b;font-weight:700;cursor:pointer}span{color:#9bafbd;font-size:12px}</style><section><small>RENEW STUDIO</small><p id="message"></p><span id="count"></span><p><button id="stop">실행 중지</button></p></section>';ui={message:shadow.getElementById('message'),count:shadow.getElementById('count'),stop:shadow.getElementById('stop')};ui.stop.onclick=stop;document.documentElement.append(host);}
    ui.message.textContent=WagalI18n.message(state.message,language);
    ui.message.parentElement.querySelector('small').textContent=WagalI18n.t('name',language)+(environment==='simulation'?' · '+WagalI18n.t('testMode',language):'');
    ui.count.textContent=WagalI18n.t('overlayCount',language,{count:state.attempt,max:state.settings?.attempts===0?'∞':(state.settings?.attempts??0)});
    ui.stop.textContent=WagalI18n.t('stop',language);ui.stop.hidden=!runner.active;
    if(state.phase==='success') showSuccessModal(state.attempt, state.target?.product);
  }
  async function stop(){revision++;runner.stop();if(token){const old=token;token=null;await rpc('RS_RELEASE',{token:old}).catch(()=>{});}}
  chrome.runtime.onMessage.addListener((msg,sender,reply)=>{
    if(sender.id!==chrome.runtime.id)return;
    (async()=>{
      if(msg.type==='STATUS')return {...runner.state,active:runner.active||starting,checked,simulation:environment==='simulation'};
      if(msg.type==='SHOW_SUCCESS_MODAL'){showSuccessModal(msg.attempts||runner.state.attempt, runner.state.target?.product);return {ok:true};}
      if(msg.type==='CHECK'){
        if(runner.active||starting)throw Error('실행 중에는 다시 점검할 수 없습니다.');
        checked=null;checkTime=0;
        const observed=await rpc('RS_INSPECT');
        // Inspection is an observation of an existing subscription, not proof this tool renewed it.
        checked=observed.kind==='success'?{...observed,kind:'active'}:observed;
        checkTime=Date.now();return checked;
      }
      if(msg.type==='STOP'){await stop();return {ok:true};}
      if(msg.type==='START'){
        if(runner.active||starting)throw Error('이미 실행 중입니다.');
        RenewEngine.validate(msg.options);
        if(!checked||checked.kind!=='ready'||Date.now()-checkTime>60000)throw Error('화면 점검을 다시 실행해 주세요. 점검은 1분간 유효합니다.');
        if(!msg.consent)throw Error('표시된 상품과 금액의 갱신 시도에 동의해 주세요.');
        starting=true;const rev=revision;
        try{
          const acquired=await rpc('RS_ACQUIRE',{target:checked});token=acquired.token;
          if(rev!==revision){await stop();return {ok:false};}
          const runToken=token;const target=checked;checked=null;
          runner.start(msg.options,target).finally(async()=>{await rpc('RS_RELEASE',{token:runToken}).catch(()=>{});if(token===runToken)token=null;});
          return {ok:true};
        }finally{starting=false;}
      }
      return {error:'알 수 없는 요청입니다.'};
    })().then(reply,e=>reply({error:e.message}));return true;
  });
})();
