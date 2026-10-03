/**
 * 와갈매크로 0.4.0 북마크릿 (Wagal Macro Bookmarklet v0.4.0)
 * 별도 확장 프로그램 설치 없이 브라우저 즐겨찾기 클릭 한 번으로 실행되는 완전 자립형 자동 갱신 엔진
 */
(function() {
  'use strict';

  if (window.__wagalBookmarkletActive) {
    alert('[와갈매크로] 이미 화면에서 실행 중입니다. 우측 하단의 패널을 확인하세요.');
    return;
  }
  window.__wagalBookmarkletActive = true;

  // --- 1. DOM 분석 및 액션 엔진 (from page.js) ---
  const norm = s => (s || '').replace(/\s+/g, ' ').trim();
  const visible = e => !!e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden' && getComputedStyle(e).display !== 'none' && !e.closest('[hidden],[aria-hidden="true"]');
  
  function getRoots() {
    const roots = [document];
    for (let i = 0; i < roots.length; i++) {
      for (const e of roots[i].querySelectorAll('*')) {
        if (e.shadowRoot) roots.push(e.shadowRoot);
      }
    }
    return roots;
  }
  
  const all = selector => getRoots().flatMap(r => Array.from(r.querySelectorAll(selector)));
  const text = e => norm(e?.innerText || e?.textContent);
  const usable = e => visible(e) && !e.disabled && e.getAttribute('aria-disabled') !== 'true';
  const buttons = scope => (scope ? Array.from(scope.querySelectorAll('button,[role="button"],input[type="submit"]')) : all('button,[role="button"],input[type="submit"]')).filter(usable);
  const label = e => norm(e.innerText || e.value || e.getAttribute('aria-label') || e.textContent);
  const unique = items => items.length === 1 ? items[0] : null;

  const product = scope => {
    const t = text(scope);
    return /YouTube\s+Premium\s+Family/i.test(t) ? 'YouTube Premium Family' : /YouTube\s+Premium/i.test(t) ? 'YouTube Premium' : null;
  };

  const productLabels = scope => {
    const labels = Array.from(scope?.querySelectorAll('h1,h2,h3,h4,p,span,div,[role="heading"]') || [])
      .filter(e => visible(e) && /^YouTube(?:\s+Premium(?:\s+Family)?)?$/i.test(text(e)));
    return labels.filter(e => !labels.some(child => child !== e && e.contains(child)));
  };

  const cleanCard = scope => {
    const labels = productLabels(scope);
    if (labels.length !== 1) return false;
    const title = labels[0];
    return !Array.from(scope.querySelectorAll('h1,h2,h3,h4,[role="heading"]')).some(e => visible(e) && e !== title && !e.contains(title) && !title.contains(e) && !/^(YouTube|Premium(?: Family)?)$/i.test(text(e)));
  };

  const price = scope => {
    const values = [...text(scope).matchAll(/(?:₹|INR|Rs\.?)\s*([\d,]+(?:\.\d{1,2})?)/gi)].map(m => 'INR ' + Number(m[1].replaceAll(',', '')));
    return [...new Set(values)].length === 1 ? values[0] : null;
  };

  const renewalText = scope => {
    const month = '(?:January|February|March|April|May|June|July|August|September|October|November|December)';
    const day = '(?:0?[1-9]|[12][0-9]|3[01])';
    const date = `(?:${day} ${month}(?:,? [0-9]{4})?|${month} ${day}(?:,? [0-9]{4})?|[0-9]{4}-[0-9]{2}-[0-9]{2})`;
    const english = text(scope).match(new RegExp(`\\b(?:Renews?(?: on)?|Next billing date)\\s*:?\\s*${date}\\b`, 'i'));
    const korean = text(scope).match(/(?:다음 (?:갱신|결제)일|갱신 예정일)\s*:?\s*(?:\d{4}년\s*)?\d{1,2}월\s*\d{1,2}일/);
    return english?.[0] || korean?.[0] || null;
  };

  function inspectPage(expected) {
    let snapshot = { kind: 'unknown' }, button = null;
    const dialogs = all('[role="dialog"],[role="alertdialog"],[aria-modal="true"],dialog[open]').filter(visible);
    const leafDialogs = dialogs.filter(d => !dialogs.some(other => other !== d && d.contains(other)));
    
    if (leafDialogs.length > 1) {
      const errors = leafDialogs.filter(d => /Unable to Complete Purchase|unable to charge|구매를 완료할 수 없/i.test(text(d)));
      if (errors.length === 1) leafDialogs.splice(0, leafDialogs.length, errors[0]);
    }

    if (leafDialogs.length === 1) {
      const dialog = leafDialogs[0];
      const t = text(dialog);
      if (/Unable to Complete Purchase|unable to charge|구매를 완료할 수 없/i.test(t)) {
        button = unique(buttons(dialog).filter(b => /^(Cancel|취소)$/i.test(label(b))));
        snapshot = { kind: button ? 'error' : 'unknown' };
      } else if (/Confirm Subscription|구독 확인/i.test(t)) {
        const cancelling = expected?.kind === 'dismiss';
        button = unique(buttons(dialog).filter(b => (cancelling ? /^(Cancel|취소)$/i : /^(Confirm|확인)$/i).test(label(b))));
        snapshot = { kind: cancelling ? (button ? 'dismiss' : 'unknown') : 'confirm', canConfirm: !!button, product: product(dialog), price: price(dialog) };
      } else {
        snapshot = { kind: /password|verification|인증|암호|sign in/i.test(t) ? 'auth' : 'unknown' };
      }
    } else if (leafDialogs.length > 1) {
      snapshot = { kind: 'ambiguous' };
    } else {
      const scope = document.querySelector('main') || document.body;
      const candidates = buttons().filter(b => /^(Renew|Resubscribe|갱신|재구독|다시 구독)(?:\b|\s|:)/i.test(label(b)) || /^(Renew|Resubscribe|갱신|재구독|다시 구독)$/i.test(label(b)));
      if (candidates.length === 1) {
        button = candidates[0];
        const card = button.parentElement || button.getRootNode().host?.parentElement;
        snapshot = { kind: 'ready', product: product(card), price: price(card) };
        if (!snapshot.product || !snapshot.price || !cleanCard(card)) snapshot = { kind: 'unknown' };
      } else if (candidates.length > 1) {
        snapshot = { kind: 'ambiguous' };
      } else if (productLabels(scope).length > 1) {
        snapshot = { kind: 'ambiguous' };
      } else if (productLabels(scope).length === 1) {
        const labels = productLabels(scope);
        const card = labels[0].closest('a,button,[role="button"],[data-test="subscription-card"]') || labels[0].parentElement;
        const cardText = text(card);
        const renewal = card && renewalText(card);
        if (card && renewal && !/cancelled|canceled|expired|만료|취소되었습니다/i.test(cardText)) {
          snapshot = { kind: 'success', product: product(card), price: price(card), renewalText: renewal };
        } else if (card && (card.matches('a,button,[role="button"]') || Array.from(scope.querySelectorAll('h1,h2,[role="heading"]')).some(e => visible(e) && /^(Subscriptions|구독)$/i.test(text(e))))) {
          snapshot = { kind: 'list', product: product(card), price: price(card) };
        } else if (all('[role="progressbar"],[aria-busy="true"]').some(visible)) {
          snapshot = { kind: 'pending' };
        }
      } else if (all('[role="progressbar"],[aria-busy="true"]').some(visible)) {
        snapshot = { kind: 'pending' };
      } else if (all('input[type="password"]').some(visible)) {
        snapshot = { kind: 'auth' };
      }
    }

    if (!expected) return snapshot;
    const identityMatches = !['ready', 'confirm'].includes(expected.kind) || (expected.product === snapshot.product && expected.price === snapshot.price);
    if (snapshot.kind !== expected.kind || !identityMatches || !button || !usable(button)) return { clicked: false };

    // 안전한 실제 클릭
    try { button.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch(e){}
    try { button.focus(); } catch(e){}
    button.click();
    return { clicked: true };
  }

  // --- 2. 사운드 알림 (Web Audio) ---
  function playSuccessSound() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const playNote = (freq, start, duration) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
        gain.gain.setValueAtTime(0.2, ctx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + duration);
      };
      playNote(523.25, 0, 0.2); // C5
      playNote(659.25, 0.2, 0.2); // E5
      playNote(783.99, 0.4, 0.4); // G5
      playNote(1046.50, 0.7, 0.6); // C6
    } catch(e) {}
  }

  // --- 3. UI 패널 생성 (Shadow DOM 기반) ---
  const host = document.createElement('div');
  host.id = 'wagal-bookmarklet-host';
  host.style.cssText = 'position:fixed;right:24px;bottom:24px;z-index:2147483647';
  const shadow = host.attachShadow({ mode: 'closed' });

  shadow.innerHTML = `
    <style>
      :host { all: initial; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
      .panel {
        width: 310px;
        padding: 18px 20px;
        border: 1px solid #305263;
        border-radius: 18px;
        background: #101d2b;
        color: #eef7fc;
        font-size: 13px;
        box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5), 0 0 20px rgba(112, 217, 210, 0.15);
        line-height: 1.5;
      }
      .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
      .badge-title { color: #70d9d2; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; }
      .badge-state { font-size: 11px; padding: 2px 7px; border-radius: 999px; background: rgba(112, 217, 210, 0.15); color: #70d9d2; font-weight: 600; }
      .target-info { background: rgba(255,255,255,0.06); padding: 8px 10px; border-radius: 8px; margin: 8px 0; font-size: 12px; }
      .target-product { font-weight: 700; color: #facc15; }
      .target-price { color: #94a3b8; }
      .count-row { margin: 10px 0 6px; font-size: 12px; color: #9bafbd; }
      .count-num { font-size: 24px; font-weight: 800; color: #70d9d2; font-family: monospace; }
      .msg-box { background: rgba(0,0,0,0.3); border-radius: 8px; padding: 8px 10px; min-height: 38px; color: #cbd5e1; font-size: 12px; margin-bottom: 12px; word-break: break-all; }
      .btn-row { display: flex; gap: 8px; }
      button { border: 0; border-radius: 8px; padding: 10px 14px; font-weight: 700; cursor: pointer; transition: all 0.2s; font-size: 13px; }
      .btn-primary { background: #70d9d2; color: #10222b; flex: 1; }
      .btn-primary:hover { background: #5ec3bd; }
      .btn-danger { background: #ef4444; color: #ffffff; flex: 1; }
      .btn-danger:hover { background: #dc2626; }
      .btn-close { background: rgba(255,255,255,0.1); color: #cbd5e1; }
      .btn-close:hover { background: rgba(255,255,255,0.18); }
    </style>
    <div class="panel">
      <div class="header">
        <span class="badge-title">WAGAL MACRO 0.4.0</span>
        <span id="badgeState" class="badge-state">준비</span>
      </div>
      <div id="targetBox" class="target-info">
        <div class="target-product" id="targetProduct">구독 화면 확인 중...</div>
        <div class="target-price" id="targetPrice">Renew 버튼이 있는 화면을 열어주세요</div>
      </div>
      <div class="count-row">
        시도 횟수: <span id="countNum" class="count-num">0</span> <span style="font-size: 12px;">/ 무한 (중지할 때까지)</span>
      </div>
      <div id="msgBox" class="msg-box">화면을 분석하고 있습니다...</div>
      <div class="btn-row">
        <button id="btnAction" class="btn-primary">시작하기</button>
        <button id="btnClose" class="btn-close">닫기</button>
      </div>
    </div>
  `;

  document.documentElement.appendChild(host);

  const ui = {
    badgeState: shadow.getElementById('badgeState'),
    targetBox: shadow.getElementById('targetBox'),
    targetProduct: shadow.getElementById('targetProduct'),
    targetPrice: shadow.getElementById('targetPrice'),
    countNum: shadow.getElementById('countNum'),
    msgBox: shadow.getElementById('msgBox'),
    btnAction: shadow.getElementById('btnAction'),
    btnClose: shadow.getElementById('btnClose')
  };

  // --- 4. 실행 제어 엔진 (from engine.js) ---
  let isRunning = false;
  let attemptCount = 0;
  let detectedTarget = null;

  function updateStatus(badge, msg, color = '#70d9d2', bg = 'rgba(112, 217, 210, 0.15)') {
    ui.badgeState.textContent = badge;
    ui.badgeState.style.color = color;
    ui.badgeState.style.background = bg;
    ui.msgBox.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
  }

  function checkScreen() {
    const inspected = inspectPage();
    if (inspected.kind === 'ready') {
      detectedTarget = inspected;
      ui.targetProduct.textContent = inspected.product;
      ui.targetPrice.textContent = inspected.price;
      updateStatus('준비 완료', '상품과 금액이 확인되었습니다. 시작을 누르세요.');
      ui.btnAction.textContent = '🚀 와리가리 시작';
      ui.btnAction.disabled = false;
    } else if (inspected.kind === 'success') {
      updateStatus('활성 구독', '이미 활성화된 구독입니다.', '#4ade80', 'rgba(74, 222, 128, 0.2)');
      ui.btnAction.textContent = '이미 갱신됨';
      ui.btnAction.disabled = true;
    } else if (inspected.kind === 'list') {
      updateStatus('상세화면 필요', 'YouTube 카드를 클릭하여 Renew 버튼 화면으로 들어가세요.', '#facc15', 'rgba(250, 204, 21, 0.2)');
      ui.btnAction.textContent = '상세화면 필요';
      ui.btnAction.disabled = true;
    } else {
      updateStatus('화면 대기', 'YouTube 구독 Renew 버튼이 보이는 페이지를 열어주세요.', '#94a3b8', 'rgba(148, 163, 184, 0.2)');
    }
  }

  // 초기 1회 점검
  checkScreen();
  const pollTimer = setInterval(() => { if (!isRunning) checkScreen(); }, 2000);

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const retryDelay = (base = 8, jitter = 3) => Math.max(5, base + Math.floor(Math.random() * (jitter * 2 + 1)) - jitter);

  async function startMacro() {
    if (isRunning) return;
    if (!detectedTarget || detectedTarget.kind !== 'ready') {
      alert('YouTube Renew 버튼이 있는 화면에서 실행해 주세요.');
      return;
    }

    isRunning = true;
    attemptCount = 0;
    ui.btnAction.textContent = '🛑 실행 중지';
    ui.btnAction.className = 'btn-danger';
    updateStatus('실행 중', '와리가리 자동 갱신을 시작합니다...');

    let stage = 'ready';
    let confirmed = false;

    try {
      while (isRunning) {
        const screen = inspectPage();
        
        // 갱신 성공 감지
        if (screen.kind === 'success') {
          updateStatus('🎉 갱신 성공!', '구독 활성화가 확인되었습니다! 결제 내역을 확인하세요.', '#4ade80', 'rgba(74, 222, 128, 0.25)');
          playSuccessSound();
          try {
            fetch('https://india-upi.vercel.app/api/macro-report', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                attempts: attemptCount,
                version: '0.4.0',
                product: screen.product || 'YouTube Premium',
                client_type: 'bookmarklet'
              })
            }).catch(() => {});
          } catch (e) {}
          alert('[와갈매크로]\n\n🎉 축하합니다! 구독 갱신이 성공적으로 승인되었습니다!\nApple 결제 내역과 YouTube 상태를 확인해 보세요.');
          break;
        }

        let action = null;
        if (stage === 'ready' && screen.kind === 'ready') {
          action = 'ready';
        } else if (stage === 'confirm' && screen.kind === 'confirm' && screen.canConfirm !== false) {
          action = 'confirm';
        } else if (stage === 'result' && screen.kind === 'error') {
          action = 'error';
        } else if (stage === 'dismiss' && ['confirm', 'dismiss'].includes(screen.kind)) {
          action = 'dismiss';
        } else if (['dismiss', 'return'].includes(stage) && screen.kind === 'ready') {
          const waitSec = retryDelay(7, 2);
          updateStatus('대기 중', `오류창을 닫았습니다. 다음 시도까지 ${waitSec}초 대기...`, '#facc15', 'rgba(250, 204, 21, 0.2)');
          for (let s = waitSec; s > 0; s--) {
            if (!isRunning) break;
            ui.msgBox.textContent = `[${new Date().toLocaleTimeString()}] 다음 시도까지 ${s}초 대기 중...`;
            await sleep(1000);
          }
          stage = 'ready';
          continue;
        }

        if (action) {
          const res = inspectPage({ ...screen, kind: action });
          if (!isRunning) break;

          if (action === 'ready') {
            stage = 'confirm';
            updateStatus('진행 중', 'Renew 클릭 완료! 갱신 확인창(Confirm)을 기다립니다.');
            await sleep(1800);
          } else if (action === 'confirm') {
            stage = 'result';
            confirmed = true;
            attemptCount++;
            ui.countNum.textContent = attemptCount;
            updateStatus('응답 대기', `[${attemptCount}회] Confirm 클릭 완료! 결제 승인 응답을 기다립니다.`);
            await sleep(3500);
          } else if (action === 'error') {
            stage = 'dismiss';
            updateStatus('오류 처리', '결제 오류창 감지 ➔ Cancel 클릭으로 닫았습니다.');
            await sleep(1500);
          } else if (action === 'dismiss') {
            stage = 'return';
            updateStatus('정리 중', '구독 화면으로 복귀 중입니다.');
            await sleep(1800);
          }
        } else {
          await sleep(500);
        }
      }
    } catch(err) {
      console.error(err);
      updateStatus('오류', '진행 중 예외가 발생했습니다: ' + err.message, '#ef4444', 'rgba(239, 68, 68, 0.2)');
    } finally {
      stopMacro();
    }
  }

  function stopMacro() {
    isRunning = false;
    ui.btnAction.textContent = '🚀 다시 시작';
    ui.btnAction.className = 'btn-primary';
    updateStatus('중지됨', '매크로가 중지되었습니다.', '#94a3b8', 'rgba(148, 163, 184, 0.2)');
  }

  ui.btnAction.onclick = () => {
    if (isRunning) stopMacro();
    else startMacro();
  };

  ui.btnClose.onclick = () => {
    stopMacro();
    clearInterval(pollTimer);
    window.__wagalBookmarkletActive = false;
    host.remove();
  };
})();
