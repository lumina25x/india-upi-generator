/**
 * PWA Installation & iOS Home Screen Add Prompt Handler
 * Supports iOS Safari, Android Chrome, and Desktop PWA
 */
(function () {
  // 1. Service Worker Registration
  if ('serviceWorker' in navigator && (window.location.protocol === 'https:' || window.location.hostname === 'localhost')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('SW registration skipped:', err);
      });
    });
  }

  // Check if already in standalone app mode
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  if (isStandalone) {
    return; // Already running as installed app!
  }

  // Detect iOS Safari
  const ua = window.navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isSafari = isIOS && /WebKit/i.test(ua) && !/CriOS|FxiOS|OPiOS|mercury/i.test(ua);

  let deferredPrompt = null;

  // Listen for beforeinstallprompt (Android / Chrome / Edge)
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showInstallPill('android');
  });

  // If on iOS Safari and not dismissed recently, show iOS install pill
  window.addEventListener('DOMContentLoaded', () => {
    const dismissedTime = localStorage.getItem('pwa_prompt_dismissed');
    const isDismissedRecently = dismissedTime && (Date.now() - Number(dismissedTime) < 1000 * 60 * 60 * 24 * 3); // 3 days

    if (isIOS && !isDismissedRecently) {
      setTimeout(() => {
        showInstallPill('ios');
      }, 1500);
    }
  });

  function showInstallPill(platform) {
    if (document.getElementById('pwaInstallPill')) return;

    const pill = document.createElement('div');
    pill.id = 'pwaInstallPill';
    pill.innerHTML = `
      <div class="pwa-pill-inner">
        <span class="pwa-pill-icon">📱</span>
        <div class="pwa-pill-text">
          <strong>스마트폰 앱으로 추가하기</strong>
          <span>${platform === 'ios' ? '사파리 홈 화면에 1초 설치' : '1초 만에 앱으로 설치'}</span>
        </div>
        <button type="button" class="pwa-pill-btn" id="pwaActionBtn">추가하기</button>
        <button type="button" class="pwa-pill-close" id="pwaCloseBtn" aria-label="닫기">✕</button>
      </div>
    `;

    document.body.appendChild(pill);

    // Event listeners
    document.getElementById('pwaActionBtn').addEventListener('click', () => {
      if (platform === 'android' && deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(() => {
          deferredPrompt = null;
          pill.remove();
        });
      } else {
        openIOSInstallModal();
      }
    });

    document.getElementById('pwaCloseBtn').addEventListener('click', (e) => {
      e.stopPropagation();
      localStorage.setItem('pwa_prompt_dismissed', Date.now().toString());
      pill.style.opacity = '0';
      pill.style.transform = 'translateY(20px)';
      setTimeout(() => pill.remove(), 300);
    });
  }

  function openIOSInstallModal() {
    let modal = document.getElementById('pwaIOSModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'pwaIOSModal';
      modal.innerHTML = `
        <div class="pwa-modal-backdrop" id="pwaModalBackdrop"></div>
        <div class="pwa-modal-card">
          <div class="pwa-modal-header">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 24px;">📱</span>
              <h3 style="margin: 0; font-size: 17px; font-weight: 800; color: #fff;">아이폰 앱처럼 홈 화면에 추가</h3>
            </div>
            <button type="button" class="pwa-modal-close" id="pwaModalClose">✕</button>
          </div>
          <p style="font-size: 13px; color: #94a3b8; margin: 10px 0 16px; line-height: 1.5;">
            앱스토어 다운로드 없이 사파리(Safari)에서 <strong>1초 만에 스마트폰 홈 화면에 앱 아이콘</strong>을 만들고 전체화면으로 이용하세요!
          </p>
          <div class="pwa-steps">
            <div class="pwa-step-item">
              <div class="pwa-step-num">1</div>
              <div class="pwa-step-desc">
                사파리 화면 하단 중앙의 <strong>공유 버튼 [ <svg style="display:inline-block; vertical-align:middle;" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg> ]</strong>을 터치합니다.
              </div>
            </div>
            <div class="pwa-step-item">
              <div class="pwa-step-num">2</div>
              <div class="pwa-step-desc">
                나타난 메뉴를 아래로 스크롤하여 <strong>[홈 화면에 추가 (+)]</strong>를 선택합니다.
              </div>
            </div>
            <div class="pwa-step-item">
              <div class="pwa-step-num">3</div>
              <div class="pwa-step-desc">
                우측 상단 <strong>[추가]</strong>를 누르면 바탕화면에 <strong>인도결제 앱</strong>이 생성됩니다!
              </div>
            </div>
          </div>
          <div style="background: rgba(16, 185, 129, 0.1); border-left: 3px solid #10b981; padding: 10px 12px; border-radius: 0 8px 8px 0; font-size: 12px; color: #a7f3d0; margin-top: 14px;">
            💡 <strong>장점:</strong> 주소창 없는 시원한 전체화면 앱 구동, 인증서 만료 없이 영구 이용 가능!
          </div>
          <button type="button" class="pwa-btn-confirm" id="pwaModalConfirm">확인했습니다</button>
        </div>
      `;
      document.body.appendChild(modal);

      const closeModal = () => {
        modal.style.display = 'none';
      };

      document.getElementById('pwaModalBackdrop').addEventListener('click', closeModal);
      document.getElementById('pwaModalClose').addEventListener('click', closeModal);
      document.getElementById('pwaModalConfirm').addEventListener('click', closeModal);
    }
    modal.style.display = 'flex';
  }

  // Inject PWA styles dynamically
  const style = document.createElement('style');
  style.textContent = `
    #pwaInstallPill {
      position: fixed;
      bottom: 24px;
      left: 20px;
      z-index: 99998;
      animation: pwaSlideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1);
      transition: all 0.3s ease;
    }
    .pwa-pill-inner {
      display: flex;
      align-items: center;
      gap: 12px;
      background: rgba(11, 21, 35, 0.95);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1.5px solid rgba(112, 217, 210, 0.45);
      border-radius: 50px;
      padding: 8px 14px 8px 12px;
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.6), 0 0 20px rgba(112, 217, 210, 0.2);
    }
    .pwa-pill-icon {
      font-size: 20px;
      flex-shrink: 0;
    }
    .pwa-pill-text {
      display: flex;
      flex-direction: column;
      line-height: 1.25;
    }
    .pwa-pill-text strong {
      font-size: 13px;
      color: #ffffff;
      font-weight: 700;
    }
    .pwa-pill-text span {
      font-size: 11px;
      color: #94a3b8;
    }
    .pwa-pill-btn {
      background: linear-gradient(135deg, #10b981, #06b6d4);
      color: #070d17;
      border: none;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 800;
      cursor: pointer;
      white-space: nowrap;
      transition: transform 0.15s ease;
    }
    .pwa-pill-btn:hover {
      transform: scale(1.05);
    }
    .pwa-pill-close {
      background: none;
      border: none;
      color: #64748b;
      font-size: 14px;
      cursor: pointer;
      padding: 4px;
      line-height: 1;
    }
    .pwa-pill-close:hover {
      color: #cbd5e1;
    }

    #pwaIOSModal {
      position: fixed;
      inset: 0;
      z-index: 100000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .pwa-modal-backdrop {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
    }
    .pwa-modal-card {
      position: relative;
      width: 100%;
      max-width: 440px;
      background: #0d1726;
      border: 1.5px solid #1e3a52;
      border-radius: 22px;
      padding: 24px;
      box-shadow: 0 24px 60px rgba(0,0,0,0.8), 0 0 30px rgba(112, 217, 210, 0.2);
      animation: pwaPopIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .pwa-modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .pwa-modal-close {
      background: none;
      border: none;
      color: #94a3b8;
      font-size: 18px;
      cursor: pointer;
      padding: 4px;
    }
    .pwa-steps {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .pwa-step-item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.06);
      padding: 10px 12px;
      border-radius: 12px;
    }
    .pwa-step-num {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: linear-gradient(135deg, #10b981, #06b6d4);
      color: #070d17;
      font-weight: 800;
      font-size: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 1px;
    }
    .pwa-step-desc {
      font-size: 12.5px;
      color: #cbd5e1;
      line-height: 1.5;
    }
    .pwa-btn-confirm {
      width: 100%;
      margin-top: 18px;
      background: linear-gradient(135deg, #10b981, #06b6d4);
      color: #070d17;
      border: none;
      padding: 12px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 800;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(6, 182, 212, 0.4);
    }

    @keyframes pwaSlideUp {
      from { transform: translateY(50px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    @keyframes pwaPopIn {
      from { transform: scale(0.92); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }

    @media (max-width: 480px) {
      #pwaInstallPill {
        left: 12px;
        right: 12px;
        bottom: 84px; /* avoid overlapping kakao button */
      }
      .pwa-pill-inner {
        width: 100%;
        justify-content: space-between;
      }
    }
  `;
  document.head.appendChild(style);
})();
