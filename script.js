/**
 * 인도 UPI ID 자동 생성기 & 성공/실패 피드백 관리 시스템
 */

// ==========================================================================
// GoingBus Affiliate Configuration (Phase 1)
// ==========================================================================
const GOINGBUS_CONFIG = {
  affiliateUrl: "https://goingbus.com?s=1kO9X8Oz" // 사용자 고유 제휴 레퍼럴 링크
};

// ==========================================================================
// Coupang Partners Affiliate Configuration (Phase 2)
// ==========================================================================
const COUPANG_CONFIG = {
  // 사용자의 Access Key/Secret Key 및 subId(indouidid)로 공식 생성된 제휴 딥링크
  affiliateUrl: "https://link.coupang.com/a/g03lOjRufc",
  subId: "indouidid",
  partnerTag: "AF4221840",
  freeDailyLimit: 10 // 10회 무료 생성 후 쿠팡 서포트 모달 표시
};

const COUPANG_STORAGE_KEYS = {
  DAILY_DATA: "upi_coupang_daily_data_v1",
  UNLOCKED_DATE: "upi_coupang_unlocked_date_v1"
};

function getTodayDateString() {
  const d = new Date();
  const pad = n => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function isUnlimitedUnlockedToday() {
  const today = getTodayDateString();
  return localStorage.getItem(COUPANG_STORAGE_KEYS.UNLOCKED_DATE) === today;
}

function getDailyAttemptCount() {
  try {
    const stored = localStorage.getItem(COUPANG_STORAGE_KEYS.DAILY_DATA);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && parsed.date === getTodayDateString()) {
        return parseInt(parsed.count, 10) || 0;
      }
    }
  } catch (e) {}
  return 0;
}

function incrementDailyAttemptCount() {
  const today = getTodayDateString();
  const current = getDailyAttemptCount();
  const next = current + 1;
  try {
    localStorage.setItem(COUPANG_STORAGE_KEYS.DAILY_DATA, JSON.stringify({ date: today, count: next }));
  } catch (e) {}
  return next;
}

function unlockUnlimitedToday() {
  const today = getTodayDateString();
  try {
    localStorage.setItem(COUPANG_STORAGE_KEYS.UNLOCKED_DATE, today);
  } catch (e) {}
  updateQuotaDisplay();
}

function openCoupangModal() {
  const modal = document.getElementById("coupangUnlockModal");
  if (modal) {
    modal.style.display = "flex";
  }
}

function closeCoupangModal() {
  const modal = document.getElementById("coupangUnlockModal");
  if (modal) {
    modal.style.display = "none";
  }
}

function handleCoupangUnlockClick() {
  unlockUnlimitedToday();
  closeCoupangModal();

  // 새 창으로 쿠팡 제휴 딥링크(subId: indouidid) 열기
  window.open(COUPANG_CONFIG.affiliateUrl, "_blank", "noopener,noreferrer");

  showToast("🎉 오늘 하루 무제한 생성이 잠금 해제되었습니다! 마음껏 이용해 보세요.", "success");

  // 사용자 편의를 위해 즉시 1개 자동 생성
  setTimeout(() => {
    handleGenerateClick();
  }, 400);
}



// ==========================================================================
// 1. 대규모 인도 성인 이름 & 대표 성씨 & 공식 핸들 DB
// ==========================================================================
const INDIAN_FIRST_NAMES = [
  // 남성 이름 (Adult Common Male Names)
  "rahul", "amit", "rohit", "sanjay", "nikhil", "karan", "manish", "rajesh",
  "vikram", "suresh", "deepak", "gaurav", "sachin", "arjun", "vishal", "rohan",
  "anand", "ajay", "sunil", "akshay", "aditya", "mohit", "kunal", "pankaj",
  "vivek", "abhishek", "rishi", "ritesh", "ashish", "tarun", "harish", "pradeep",
  "manoj", "vinay", "sandeep", "dinesh", "rakesh", "vijay", "anil", "mukesh",
  "sumit", "ravi", "sourabh", "chetan", "varun", "dev", "mayank", "harsh",
  "ayush", "dhruv", "karthik", "shivam", "sidharth", "kabir", "yash", "hardik",
  
  // 여성 이름 (Adult Common Female Names)
  "priya", "neha", "pooja", "sneha", "anjali", "divya", "swati", "nisha",
  "rekha", "preeti", "kajal", "priyanka", "shweta", "jyoti", "deepika", "pallavi",
  "aarti", "shilpa", "nidhi", "megha", "tara", "anita", "rhea", "riya",
  "simran", "tanvi", "kavita", "sonia", "poonam", "ritu", "sunita", "geeta",
  "manisha", "komal", "radha", "bhavna", "meena", "payal", "monika", "shreya",
  "kriti", "diya", "ananya", "ishita", "saumya", "vidya", "roshni", "madhu",
  "garima", "aditi", "chhavi", "parul", "richa", "sangeeta", "sheetal", "urvashi"
];

const INDIAN_LAST_NAMES = [
  "sharma", "verma", "gupta", "patel", "rao", "singh", "kumar", "mehta",
  "joshi", "bose", "nair", "reddy", "malhotra", "chopra", "tiwari", "jain",
  "das", "yadav", "kulkarni", "iyer", "desai", "pillai", "shetty", "choudhary",
  "mishra", "chauhan", "agarwal", "shah", "pandey", "bhatt", "saxena", "sengupta",
  "banerjee", "mukherjee", "chatterjee", "gowda", "menon", "kapoor", "shukla"
];

const HANDLES_BY_CATEGORY = {
  paytm: ["@paytm", "@ptsbi", "@ptaxis", "@pthdfc", "@ptyes"],
  phonepe: ["@ybl", "@ibl", "@axl"],
  gpay: ["@oksbi", "@okicici", "@okhdfcbank", "@okaxis"],
  sbi: ["@sbi", "@upi", "@icici", "@kotak"]
};

// 댓글에서 검증된 가장 높은 성공률의 단순 숫자 패턴 풀
const COMMON_SIMPLE_NUMBERS = [
  "12", "123", "1234", "23", "45", "78", "89", "99",
  "2024", "2025", "2026", "77", "88", "11", "07"
];

// ==========================================================================
// 2. State & Storage Management & Helpers
// ==========================================================================
const GOOGLE_SHEET_API_URL = "https://script.google.com/macros/s/AKfycbzsZyHJHsV96TikY6SuXPfiUwgxoG-htAdvNk60pfC-HlCXhEpEtvV-TN4s2OLyEK0a/exec";

const STORAGE_KEYS = {
  SUCCESS: "upi_success_list_v1",
  FAILED: "upi_failed_list_v1",
  TOTAL_COUNT: "upi_total_generated_count"
};

function getFormattedNow() {
  const now = new Date();
  const pad = n => n.toString().padStart(2, '0');
  const dateStr = `${now.getFullYear()}.${pad(now.getMonth() + 1)}.${pad(now.getDate())}`;
  const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  return `${dateStr} ${timeStr}`;
}

let state = {
  currentId: null,
  currentMeta: null,
  successList: [], // array of { id, timestamp, memo }
  failedList: [],  // array of { id, timestamp }
  failedSet: new Set(), // Set of strings for O(1) candidate exclusion lookup
  totalCount: 0
};

// ==========================================================================
// Rate Limiting & Abuse Prevention Configuration
// ==========================================================================
const RATE_LIMIT_CONFIG = {
  BURST_WINDOW_MS: 5000,          // 5초
  BURST_MAX_CLICKS: 5,             // 5초 내 5회 이상 클릭 시
  BURST_COOLDOWN_SEC: 10,          // 10초 쿨다운
  
  MAX_QUOTA_COUNT: 100,            // 누적 100회
  BLOCK_DURATION_MS: 30 * 60 * 1000 // 30분 차단 (1,800,000ms)
};

const RATE_STORAGE_KEYS = {
  QUOTA_COUNT: "upi_quota_count_v1",
  BLOCK_UNTIL: "upi_block_until_v1"
};

let rateState = {
  quotaCount: 0,
  blockUntil: 0,
  recentClicks: [], // click timestamps within 5 seconds
  burstInterval: null,
  blockInterval: null
};

// ==========================================================================
// 3. Initialization
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
  loadStoredData();
  bindEvents();
  initRateLimiting();
  updateStats();
  renderLists();
  fetchGlobalSheetData();
});

async function fetchGlobalSheetData() {
  if (!GOOGLE_SHEET_API_URL) return;
  try {
    const resp = await fetch(GOOGLE_SHEET_API_URL);
    if (!resp.ok) return;
    const data = await resp.json();
    let updated = false;

    // Merge remote failed IDs into state.failedSet & state.failedList
    if (data.failed && Array.isArray(data.failed)) {
      data.failed.forEach(rawId => {
        if (!rawId && rawId !== 0) return;
        const id = String(rawId).trim();
        if (!id) return;
        if (!state.failedSet.has(id)) {
          state.failedSet.add(id);
          state.failedList.unshift({
            id: id,
            timestamp: getFormattedNow()
          });
          updated = true;
        }
      });
    }

    // Merge remote success IDs into state.successList
    if (data.success && Array.isArray(data.success)) {
      data.success.forEach(item => {
        if (!item) return;
        const id = typeof item === "string" ? item.trim() : String(item.id || "").trim();
        if (!id) return;
        const exists = state.successList.some(s => s.id === id);
        const memoStr = (item.memo !== undefined && item.memo !== null && String(item.memo).trim() !== "")
          ? String(item.memo).trim()
          : "성공 확인 완료 👍";
        const timeStr = (item.timestamp !== undefined && item.timestamp !== null)
          ? String(item.timestamp).trim()
          : getFormattedNow();

        if (!exists) {
          state.successList.unshift({
            id: id,
            timestamp: timeStr,
            memo: memoStr
          });
          updated = true;
        } else {
          // Keep existing memo sanitized
          const existing = state.successList.find(s => s.id === id);
          if (existing) {
            existing.memo = String(existing.memo ?? memoStr ?? "").trim() || "성공 확인 완료 👍";
          }
        }
      });
    }

    if (updated) {
      saveStoredData();
      updateStats();
      renderLists();
      showToast("⚡ 실시간 최신 데이터가 동기화되었습니다.", "info");
    }
  } catch (err) {
    console.log("Google Sheets sync note:", err);
  }
}

function syncToGoogleSheet(payload) {
  if (!GOOGLE_SHEET_API_URL) return;
  try {
    // Send as text/plain with no-cors to prevent CORS preflight error in Google Apps Script
    fetch(GOOGLE_SHEET_API_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(payload)
    }).catch(e => console.log("Sheet post note:", e));
  } catch (err) {
    console.log("Sheet sync error:", err);
  }
}

function loadStoredData() {
  try {
    const storedSuccess = localStorage.getItem(STORAGE_KEYS.SUCCESS);
    if (storedSuccess) {
      const parsed = JSON.parse(storedSuccess);
      if (Array.isArray(parsed)) {
        state.successList = parsed.map(item => {
          if (!item) return null;
          if (typeof item === "string") return { id: item, timestamp: getFormattedNow(), memo: "성공 확인 완료 👍" };
          return {
            id: String(item.id || "").trim(),
            timestamp: String(item.timestamp || `${item.date || ''} ${item.time || ''}`).trim() || getFormattedNow(),
            memo: String(item.memo ?? "").trim() || "성공 확인 완료 👍"
          };
        }).filter(item => Boolean(item && item.id));
      }
    }

    const storedFailed = localStorage.getItem(STORAGE_KEYS.FAILED);
    if (storedFailed) {
      const parsed = JSON.parse(storedFailed);
      if (Array.isArray(parsed)) {
        state.failedList = parsed.map(item => {
          if (!item) return null;
          if (typeof item === "string") return { id: item, timestamp: getFormattedNow() };
          return {
            id: String(item.id || "").trim(),
            timestamp: String(item.timestamp || `${item.date || ''} ${item.time || ''}`).trim() || getFormattedNow()
          };
        }).filter(item => Boolean(item && item.id));
        state.failedSet = new Set(state.failedList.map(f => f.id));
      }
    }

    const storedTotal = localStorage.getItem(STORAGE_KEYS.TOTAL_COUNT);
    if (storedTotal) {
      state.totalCount = parseInt(storedTotal, 10) || 0;
    }
  } catch (err) {
    console.error("Failed to load local storage:", err);
  }
}

function saveStoredData() {
  try {
    localStorage.setItem(STORAGE_KEYS.SUCCESS, JSON.stringify(state.successList));
    localStorage.setItem(STORAGE_KEYS.FAILED, JSON.stringify(state.failedList));
    localStorage.setItem(STORAGE_KEYS.TOTAL_COUNT, state.totalCount.toString());
  } catch (err) {
    console.error("Failed to save local storage:", err);
  }
}

// ==========================================================================
// 4. UPI ID Generation Core (Excludes Failed IDs)
// ==========================================================================
function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function resolveHandle(category) {
  if (category === "all") {
    const allHandles = [
      ...HANDLES_BY_CATEGORY.paytm,
      ...HANDLES_BY_CATEGORY.phonepe,
      ...HANDLES_BY_CATEGORY.gpay,
      ...HANDLES_BY_CATEGORY.sbi
    ];
    return getRandomItem(allHandles);
  }
  return getRandomItem(HANDLES_BY_CATEGORY[category] || HANDLES_BY_CATEGORY.paytm);
}

function detectAppFromHandle(handle) {
  if (handle.includes("paytm") || handle.startsWith("@pt")) return "Paytm";
  if (handle.includes("ybl") || handle.includes("ibl") || handle.includes("axl")) return "PhonePe";
  if (handle.startsWith("@ok")) return "Google Pay";
  return "BHIM/Bank";
}

/**
 * 단일 UPI ID 생성 (실패 목록 영구 제외 로직 포함)
 */
function generateCandidateId(patternMode, handleCategory) {
  const fname = getRandomItem(INDIAN_FIRST_NAMES);
  const lname = getRandomItem(INDIAN_LAST_NAMES);
  const handle = resolveHandle(handleCategory);
  let username = "";
  let patternDescription = "";

  let mode = patternMode;
  if (mode === "smart") {
    // 70% 확률로 123 단순숫자 조합, 30% 확률로 이름.성씨 조합
    mode = Math.random() < 0.7 ? "name_only" : "name_surname";
  } else if (mode === "all_random") {
    const modes = ["name_only", "name_surname", "name_surname_num", "name_concat"];
    mode = getRandomItem(modes);
  }

  switch (mode) {
    case "name_only":
      // [이름 + 12/123/단순숫자] (댓글 추천 1순위)
      const num = getRandomItem(COMMON_SIMPLE_NUMBERS);
      username = `${fname}${num}`;
      patternDescription = `이름 + 숫자 (${num})`;
      break;

    case "name_surname":
      // [이름.성씨]
      username = `${fname}.${lname}`;
      patternDescription = `이름.성씨 조합`;
      break;

    case "name_surname_num":
      // [이름.성씨 + 숫자]
      const snum = getRandomItem(["12", "123", getRandomInt(10, 99).toString()]);
      username = `${fname}.${lname}${snum}`;
      patternDescription = `이름.성씨 + 숫자 (${snum})`;
      break;

    case "name_concat":
      // [이름성 붙여쓰기]
      username = `${fname}${lname}`;
      patternDescription = `이름+성 붙여쓰기`;
      break;

    default:
      username = `${fname}${getRandomItem(COMMON_SIMPLE_NUMBERS)}`;
      patternDescription = `이름 + 숫자 조합`;
  }

  const fullId = `${username}${handle}`.toLowerCase();
  return {
    id: fullId,
    name: fname.charAt(0).toUpperCase() + fname.slice(1),
    handle: handle,
    app: detectAppFromHandle(handle),
    patternDesc: patternDescription
  };
}

/**
 * 실패 목록에 없는 고유한 ID를 찾을 때까지 반복 생성
 */
function generateUniqueUpiId() {
  const patternMode = document.getElementById("patternSelect").value;
  const handleCategory = document.getElementById("handleSelect").value;

  let candidate = null;
  let attempts = 0;
  const maxAttempts = 500; // 가드

  while (attempts < maxAttempts) {
    candidate = generateCandidateId(patternMode, handleCategory);
    if (!state.failedSet.has(candidate.id)) {
      break;
    }
    attempts++;
  }

  return candidate;
}

// ==========================================================================
// 5. Rate Limiting Management (30-min Block & 10s Cooldown)
// ==========================================================================
function initRateLimiting() {
  try {
    const storedQuota = localStorage.getItem(RATE_STORAGE_KEYS.QUOTA_COUNT);
    if (storedQuota) {
      rateState.quotaCount = parseInt(storedQuota, 10) || 0;
    }

    const storedBlock = localStorage.getItem(RATE_STORAGE_KEYS.BLOCK_UNTIL);
    if (storedBlock) {
      rateState.blockUntil = parseInt(storedBlock, 10) || 0;
    }
  } catch (e) {
    console.error("Rate limit storage load error:", e);
  }

  updateQuotaDisplay();

  const now = Date.now();
  if (rateState.blockUntil > now) {
    activateBlockState();
  } else if (rateState.blockUntil > 0 && rateState.blockUntil <= now) {
    unblockState();
  }
}

function updateQuotaDisplay() {
  const quotaElem = document.getElementById("quotaCountDisplay");
  if (quotaElem) {
    quotaElem.textContent = Math.min(rateState.quotaCount, RATE_LIMIT_CONFIG.MAX_QUOTA_COUNT);
  }

  const dailyCountElem = document.getElementById("dailyCountDisplay");
  const dailyBadgeElem = document.getElementById("dailyQuotaBadge");

  if (isUnlimitedUnlockedToday()) {
    if (dailyBadgeElem) {
      dailyBadgeElem.className = "quota-badge daily-badge unlocked";
      dailyBadgeElem.innerHTML = `✨ 오늘 무제한 활성화됨`;
    }
  } else {
    const count = getDailyAttemptCount();
    if (dailyCountElem) {
      dailyCountElem.textContent = Math.min(count, COUPANG_CONFIG.freeDailyLimit);
    }
    if (dailyBadgeElem) {
      dailyBadgeElem.className = "quota-badge daily-badge";
      dailyBadgeElem.innerHTML = `오늘 무료: <strong id="dailyCountDisplay">${Math.min(count, COUPANG_CONFIG.freeDailyLimit)}</strong> / ${COUPANG_CONFIG.freeDailyLimit}회`;
    }
  }
}

function activateBlockState() {
  const banner = document.getElementById("blockAlertBanner");
  const btn = document.getElementById("btnGenerate");
  if (banner) banner.style.display = "block";

  if (btn) {
    btn.disabled = true;
    btn.classList.add("quota-blocked");
    btn.innerHTML = `<span style="margin-right:6px;">🔒</span> 30분 대기 중 (100회 한도 도달)`;
  }

  if (rateState.blockInterval) {
    clearInterval(rateState.blockInterval);
  }

  function tickBlockTimer() {
    const remaining = rateState.blockUntil - Date.now();
    if (remaining <= 0) {
      unblockState();
      showToast("🎉 30분이 경과하여 생성 제한이 해제되었습니다.", "success");
      return;
    }

    const mins = Math.floor(remaining / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);
    const timerElem = document.getElementById("blockTimerText");
    if (timerElem) {
      timerElem.textContent = `${mins}분 ${secs.toString().padStart(2, '0')}초`;
    }
  }

  tickBlockTimer();
  rateState.blockInterval = setInterval(tickBlockTimer, 1000);
}

function unblockState() {
  if (rateState.blockInterval) {
    clearInterval(rateState.blockInterval);
    rateState.blockInterval = null;
  }

  rateState.blockUntil = 0;
  rateState.quotaCount = 0;
  try {
    localStorage.removeItem(RATE_STORAGE_KEYS.BLOCK_UNTIL);
    localStorage.setItem(RATE_STORAGE_KEYS.QUOTA_COUNT, "0");
  } catch (e) {}

  updateQuotaDisplay();

  const banner = document.getElementById("blockAlertBanner");
  if (banner) banner.style.display = "none";

  const btn = document.getElementById("btnGenerate");
  if (btn) {
    btn.disabled = false;
    btn.classList.remove("quota-blocked");
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path>
      </svg>
      새로운 UPI ID 생성
    `;
  }
}

function triggerBurstCooldown() {
  const btn = document.getElementById("btnGenerate");
  if (!btn || btn.classList.contains("quota-blocked")) return;

  btn.disabled = true;
  btn.classList.add("cooldown-active");

  let remainingSec = RATE_LIMIT_CONFIG.BURST_COOLDOWN_SEC;

  function updateBtnCooldownText() {
    btn.innerHTML = `<span style="margin-right:6px;">⏳</span> 과도한 연속 클릭 (${remainingSec}초 대기 중...)`;
  }

  updateBtnCooldownText();
  showToast("⚠️ 5초 동안 5회 이상 연속 클릭이 감지되었습니다. 10초간 잠시 대기해 주세요.", "fail");

  if (rateState.burstInterval) {
    clearInterval(rateState.burstInterval);
  }

  rateState.burstInterval = setInterval(() => {
    remainingSec--;
    if (remainingSec <= 0) {
      clearInterval(rateState.burstInterval);
      rateState.burstInterval = null;
      rateState.recentClicks = [];

      // If user became quota-blocked in the meantime, don't restore
      if (rateState.blockUntil > Date.now()) return;

      btn.disabled = false;
      btn.classList.remove("cooldown-active");
      btn.innerHTML = `
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path>
        </svg>
        새로운 UPI ID 생성
      `;
      showToast("대기 시간이 종료되었습니다. 다시 생성하실 수 있습니다.", "info");
    } else {
      updateBtnCooldownText();
    }
  }, 1000);
}

// ==========================================================================
// 6. UI Update & Actions
// ==========================================================================
function handleGenerateClick() {
  const now = Date.now();

  // 1. Check 30-min Block
  if (rateState.blockUntil > now) {
    showToast("🛑 생성 한도(100회)에 도달하여 30분간 대기 중입니다.", "fail");
    return;
  }

  // 2. Check 10-s Burst Cooldown
  const btn = document.getElementById("btnGenerate");
  if (btn && btn.classList.contains("cooldown-active")) {
    return;
  }

  // 3. Check Daily 10-Attempt Free Limit for Coupang Unlock
  if (!isUnlimitedUnlockedToday()) {
    const dailyCount = getDailyAttemptCount();
    if (dailyCount >= COUPANG_CONFIG.freeDailyLimit) {
      openCoupangModal();
      showToast("🎁 기본 무료 10회 생성 완료! 쿠팡 1초 방문 시 오늘 무제한 이용이 가능합니다.", "info");
      return;
    }
  }

  // 4. Track Burst Clicks (within 5 seconds)
  rateState.recentClicks = rateState.recentClicks.filter(t => now - t < RATE_LIMIT_CONFIG.BURST_WINDOW_MS);
  rateState.recentClicks.push(now);
  const isBurstTriggered = rateState.recentClicks.length >= RATE_LIMIT_CONFIG.BURST_MAX_CLICKS;

  const candidate = generateUniqueUpiId();
  if (!candidate) {
    showToast("사용 가능한 조합을 생성하지 못했습니다. 설정을 변경해 보세요.", "fail");
    return;
  }

  state.currentId = candidate.id;
  state.currentMeta = candidate;
  state.totalCount++;
  saveStoredData();

  // Increment daily attempt count if not unlocked yet
  if (!isUnlimitedUnlockedToday()) {
    incrementDailyAttemptCount();
  }

  // Display ID
  const displayElem = document.getElementById("currentUpiDisplay");
  displayElem.textContent = candidate.id;
  displayElem.classList.remove("placeholder");

  // Display Meta
  const metaElem = document.getElementById("idMetaInfo");
  metaElem.style.display = "flex";
  document.getElementById("metaAppTag").textContent = candidate.app;
  document.getElementById("metaNameTag").textContent = candidate.name;
  document.getElementById("metaPatternText").textContent = candidate.patternDesc;

  // Copy button enable
  const copyBtn = document.getElementById("btnCopy");
  copyBtn.disabled = false;
  resetCopyBtn();

  // Show Feedback Prompt
  document.getElementById("feedbackPrompt").style.display = "flex";

  // Flash highlight animation
  const wrapper = document.querySelector(".id-display-wrapper");
  wrapper.classList.remove("highlighted");
  void wrapper.offsetWidth; // trigger reflow
  wrapper.classList.add("highlighted");

  updateStats();

  // 4. Increment Quota Counter
  rateState.quotaCount++;
  try {
    localStorage.setItem(RATE_STORAGE_KEYS.QUOTA_COUNT, rateState.quotaCount.toString());
  } catch (e) {}
  updateQuotaDisplay();

  // 5. Check if 100-attempt Quota reached
  if (rateState.quotaCount >= RATE_LIMIT_CONFIG.MAX_QUOTA_COUNT) {
    rateState.blockUntil = Date.now() + RATE_LIMIT_CONFIG.BLOCK_DURATION_MS;
    try {
      localStorage.setItem(RATE_STORAGE_KEYS.BLOCK_UNTIL, rateState.blockUntil.toString());
    } catch (e) {}
    activateBlockState();
    showToast("🛑 누적 100회 시도 완료: 30분간 생성이 일시 중단됩니다.", "fail");
    return;
  }

  // 6. Trigger Burst Cooldown if 5 clicks in 5 seconds
  if (isBurstTriggered) {
    triggerBurstCooldown();
  }
}

function handleCopyClick() {
  if (!state.currentId) return;
  copyTextToClipboard(state.currentId);
  setCopyBtnCopied();
  showToast(`클립보드에 복사되었습니다: ${state.currentId}`, "info");
}

function handleSuccessClick() {
  if (!state.currentId) return;
  openSuccessModal();
}

function openSuccessModal() {
  if (!state.currentId) return;
  document.getElementById("modalSuccessId").textContent = state.currentId;
  const memoInput = document.getElementById("successMemoInput");
  memoInput.value = "";
  
  const charCounter = document.getElementById("charCounter");
  if (charCounter) charCounter.textContent = "0/35";

  // Reset chips active state
  document.querySelectorAll("#presetChips .tag-chip").forEach(c => c.classList.remove("active"));
  
  document.getElementById("successModal").style.display = "flex";
  setTimeout(() => memoInput.focus(), 150);
}

function closeSuccessModal() {
  document.getElementById("successModal").style.display = "none";
}

function submitSuccessVerification() {
  if (!state.currentId) return;

  const memoInput = document.getElementById("successMemoInput");
  const memo = memoInput.value.trim() || "실제 결제/등록 성공 확인됨 👍";
  const now = getFormattedNow();

  const exists = state.successList.some(item => item.id === state.currentId);
  if (!exists) {
    state.successList.unshift({
      id: state.currentId,
      timestamp: now,
      memo: memo
    });
  }

  // If it was somehow in failedSet, remove it
  state.failedSet.delete(state.currentId);
  state.failedList = state.failedList.filter(item => item.id !== state.currentId);

  saveStoredData();
  updateStats();
  renderLists();

  // Sync to Google Sheet in background
  syncToGoogleSheet({
    id: state.currentId,
    type: "SUCCESS",
    timestamp: now,
    memo: memo
  });

  closeSuccessModal();
  showToast(`🎉 실제 성공 사례로 인증 등록되었습니다! (${state.currentId})`, "success");

  // Hide feedback prompt
  document.getElementById("feedbackPrompt").style.display = "none";
}

function handleFailClick() {
  if (!state.currentId) return;

  const failedId = state.currentId;
  const now = getFormattedNow();

  if (!state.failedSet.has(failedId)) {
    state.failedSet.add(failedId);
    state.failedList.unshift({
      id: failedId,
      timestamp: now
    });
  }

  // Remove from success if exists
  state.successList = state.successList.filter(item => item.id !== failedId);

  saveStoredData();
  updateStats();
  renderLists();

  // Sync to Google Sheet in background
  syncToGoogleSheet({
    id: failedId,
    type: "FAIL",
    timestamp: now,
    memo: ""
  });

  showToast(`⛔ 제외 목록에 등록되었습니다. 다음 생성 시 제외됩니다.`, "fail");

  // Automatically generate a new candidate right away!
  handleGenerateClick();
}

function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str).replace(/[&<>"']/g, m => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[m]);
}

// ==========================================================================
// 7. Render Lists (Success vs Failed)
// ==========================================================================
function renderLists() {
  // Render Success List
  const successListElem = document.getElementById("successList");
  const emptySuccessElem = document.getElementById("emptySuccess");
  successListElem.innerHTML = "";

  if (state.successList.length === 0) {
    emptySuccessElem.style.display = "flex";
  } else {
    emptySuccessElem.style.display = "none";
    state.successList.forEach((item, index) => {
      const li = document.createElement("li");
      li.className = "id-list-item success-item";
      li.innerHTML = `
        <div class="item-main">
          <span class="item-id-text">${item.id}</span>
          <span class="item-timestamp">🕒 ${item.timestamp || getFormattedNow()}</span>
          ${item.memo ? `<span class="item-memo">💬 ${escapeHtml(item.memo)}</span>` : ""}
        </div>
        <div class="item-actions">
          <button class="btn-item-action copy" data-id="${item.id}" title="복사">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </button>
        </div>
      `;
      successListElem.appendChild(li);
    });
  }

  // Render Failed List
  const failedListElem = document.getElementById("failedList");
  const emptyFailedElem = document.getElementById("emptyFailed");
  failedListElem.innerHTML = "";

  if (state.failedList.length === 0) {
    emptyFailedElem.style.display = "flex";
  } else {
    emptyFailedElem.style.display = "none";
    state.failedList.forEach((item, index) => {
      const li = document.createElement("li");
      li.className = "id-list-item failed-item";
      li.innerHTML = `
        <div class="item-main">
          <span class="item-id-text">${item.id}</span>
          <span class="item-timestamp">🕒 ${item.timestamp || getFormattedNow()}</span>
        </div>
      `;
      failedListElem.appendChild(li);
    });
  }

  // Bind copy button listener for success list
  successListElem.querySelectorAll(".btn-item-action.copy").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const text = e.currentTarget.getAttribute("data-id");
      copyTextToClipboard(text);
      showToast(`복사됨: ${text}`, "info");
    });
  });
}

function updateStats() {
  const totalElem = document.getElementById("statTotalCount");
  if (totalElem) totalElem.textContent = state.totalCount;

  document.getElementById("statSuccessCount").textContent = state.successList.length;
  document.getElementById("statFailedCount").textContent = state.failedList.length;

  document.getElementById("successCounter").textContent = state.successList.length;
  document.getElementById("failedCounter").textContent = state.failedList.length;

  // Real-time Big Data Statistics Computation
  computeAndRenderSuccessStats();
}

function computeAndRenderSuccessStats() {
  const list = state.successList || [];
  const total = list.length;

  const rankingElem = document.getElementById("bankRankingList");
  const patternElem = document.getElementById("patternStatBody");
  const testimonialElem = document.getElementById("testimonialsList");

  if (!rankingElem || !patternElem || !testimonialElem) return;

  if (total === 0) {
    rankingElem.innerHTML = `<div class="stats-empty">통계 데이터 수집 중입니다...</div>`;
    patternElem.innerHTML = `<div class="stats-empty">통계 데이터 수집 중입니다...</div>`;
    testimonialElem.innerHTML = `<div class="stats-empty">등록된 후기가 없습니다.</div>`;
    return;
  }

  // 1. Group by Bank Categories
  const bankCounts = {
    paytm: { label: "Paytm (@paytm, @ptyes)", count: 0, color: "#38bdf8" },
    sbi: { label: "SBI / 국영 (@sbi, @oksbi, @upi)", count: 0, color: "#34d399" },
    phonepe: { label: "PhonePe (@ybl, @ibl, @axl)", count: 0, color: "#a78bfa" },
    others: { label: "기타 은행 (@icici, @kotak 등)", count: 0, color: "#fb923c" }
  };

  // 2. Group by 4 Detailed Structural Patterns
  const patternCounts = {
    name_num: { label: "이름 + 123/단순숫자", count: 0, color: "#10b981", desc: "예: sneha123" },
    name_dot_surname: { label: "이름.성씨 점(.) 구분", count: 0, color: "#38bdf8", desc: "예: amit.rao" },
    name_concat: { label: "이름+성씨 붙여쓰기", count: 0, color: "#a78bfa", desc: "예: ritujoshi" },
    name_dot_num: { label: "이름.성+숫자 복합", count: 0, color: "#fb923c", desc: "예: priya.patel45" }
  };

  // Preset chip & default text set to strictly filter out
  const PRESET_CHIP_TEXTS = new Set([
    "나마스테 🙏 덕분에 성공했습니다!",
    "바로 갱신 성공했습니다! 👍",
    "123 숫자 붙여서 바로 뚫렸어요! 🔥",
    "유튜브 앱 동기화까지 완료했습니다 📱",
    "감사합니다! 덕분에 살았습니다 🙏",
    "실제 결제/등록 성공 확인됨 👍",
    "실제 결제/등록 성공 확인됨",
    "성공 확인 완료 👍"
  ]);

  const purelyTypedReviews = [];

  list.forEach(item => {
    if (!item || !item.id) return;
    const fullId = String(item.id || "").toLowerCase();
    const parts = fullId.split("@");
    const user = parts[0] || "";
    const h = "@" + (parts[1] || "");

    // Bank classification
    if (h.includes("paytm") || h.startsWith("@pt")) {
      bankCounts.paytm.count++;
    } else if (h === "@sbi" || h === "@oksbi" || h === "@upi") {
      bankCounts.sbi.count++;
    } else if (h === "@ybl" || h === "@ibl" || h === "@axl") {
      bankCounts.phonepe.count++;
    } else {
      bankCounts.others.count++;
    }

    // 4-Type Detailed Pattern Classification
    if (user.includes(".")) {
      if (/\d/.test(user)) {
        patternCounts.name_dot_num.count++;
      } else {
        patternCounts.name_dot_surname.count++;
      }
    } else if (/\d/.test(user)) {
      patternCounts.name_num.count++;
    } else {
      patternCounts.name_concat.count++;
    }

    // Purely user-typed custom reviews filter
    const memo = String(item.memo ?? "").trim();
    const isPreset = PRESET_CHIP_TEXTS.has(memo);
    const isTestId = fullId.includes("test_") || memo.includes("테스트 성공");
    if (memo && !isPreset && !isTestId) {
      purelyTypedReviews.push({
        id: String(item.id),
        memo: memo,
        time: String(item.timestamp || "")
      });
    }
  });

  // Sort banks by count descending
  const sortedBanks = Object.values(bankCounts).sort((a, b) => b.count - a.count);

  // Render Bank Ranking
  rankingElem.innerHTML = sortedBanks.map((b, idx) => {
    const pct = total > 0 ? ((b.count / total) * 100).toFixed(1) : "0.0";
    const rankBadge = idx === 0 ? "🥇 1위" : idx === 1 ? "🥈 2위" : idx === 2 ? "🥉 3위" : "4위";
    return `
      <div class="bank-rank-row">
        <div class="bank-rank-info">
          <div>
            <span class="bank-rank-badge ${idx === 0 ? 'top-rank' : ''}">${rankBadge}</span>
            <span class="bank-rank-name">${b.label}</span>
          </div>
          <span class="bank-rank-pct">${pct}% (${b.count}건)</span>
        </div>
        <div class="progress-bar-bg">
          <div class="progress-bar-fill" style="width: ${pct}%; background-color: ${b.color};"></div>
        </div>
      </div>
    `;
  }).join("");

  // Sort patterns by count descending
  const sortedPatterns = Object.values(patternCounts).sort((a, b) => b.count - a.count);

  // Render 4-Type Detailed Pattern Stat
  patternElem.innerHTML = sortedPatterns.map((p, idx) => {
    const pct = total > 0 ? ((p.count / total) * 100).toFixed(1) : "0.0";
    const rankBadge = idx === 0 ? "🥇 1위" : idx === 1 ? "🥈 2위" : idx === 2 ? "🥉 3위" : "4위";
    return `
      <div class="pattern-compare-row">
        <div class="pattern-info">
          <div>
            <span class="bank-rank-badge ${idx === 0 ? 'top-rank' : ''}">${rankBadge}</span>
            <span class="pattern-label">${p.label}</span>
          </div>
          <span class="pattern-value">${pct}% (${p.count}건)</span>
        </div>
        <div class="progress-bar-bg">
          <div class="progress-bar-fill" style="width: ${pct}%; background-color: ${p.color};"></div>
        </div>
      </div>
    `;
  }).join("");

  // Render Purely Typed User Testimonials
  if (purelyTypedReviews.length > 0) {
    testimonialElem.innerHTML = purelyTypedReviews.map(t => {
      const dateOnly = (t.time || "").split(" ")[0] || "";
      return `
        <div class="testimonial-card">
          <div class="testimonial-bubble">💬 "${escapeHtml(t.memo)}"</div>
          <div class="testimonial-meta">
            <span class="test-id">${escapeHtml(t.id)}</span>
            <span class="test-time">${escapeHtml(dateOnly)}</span>
          </div>
        </div>
      `;
    }).join("");
  } else {
    testimonialElem.innerHTML = `<div class="stats-empty">직접 작성된 후기가 아직 없습니다.</div>`;
  }
}

// ==========================================================================
// 8. Clipboard & Helpers
// ==========================================================================
function copyTextToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).catch(err => {
      fallbackCopy(text);
    });
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text) {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.position = "fixed";
  textArea.style.left = "-999999px";
  textArea.style.top = "-999999px";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try {
    document.execCommand("copy");
  } catch (err) {
    console.error("Fallback copy failed:", err);
  }
  textArea.remove();
}

function setCopyBtnCopied() {
  const btn = document.getElementById("btnCopy");
  const text = document.getElementById("copyBtnText");
  btn.classList.add("copied");
  text.textContent = "복사완료!";
  setTimeout(() => {
    resetCopyBtn();
  }, 2000);
}

function resetCopyBtn() {
  const btn = document.getElementById("btnCopy");
  const text = document.getElementById("copyBtnText");
  btn.classList.remove("copied");
  text.textContent = "복사";
}

function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(10px)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 2800);
}

// ==========================================================================
// 9. Event Listeners
// ==========================================================================
function bindEvents() {
  // Set GoingBus Affiliate Link
  const directLinkElem = document.getElementById("goingbusAffiliateLink");
  if (directLinkElem) directLinkElem.href = GOINGBUS_CONFIG.affiliateUrl;

  document.getElementById("btnGenerate").addEventListener("click", handleGenerateClick);
  document.getElementById("btnCopy").addEventListener("click", handleCopyClick);
  document.getElementById("btnMarkSuccess").addEventListener("click", handleSuccessClick);
  document.getElementById("btnMarkFail").addEventListener("click", handleFailClick);

  // Memo character counter
  const memoInput = document.getElementById("successMemoInput");
  const charCounter = document.getElementById("charCounter");
  if (memoInput && charCounter) {
    memoInput.addEventListener("input", () => {
      charCounter.textContent = `${memoInput.value.length}/35`;
    });
  }

  // Modal Event Listeners
  document.getElementById("btnCloseSuccessModal").addEventListener("click", closeSuccessModal);
  document.getElementById("btnCancelSuccessModal").addEventListener("click", closeSuccessModal);
  document.getElementById("btnSubmitSuccess").addEventListener("click", submitSuccessVerification);

  // Close modal when clicking dark overlay outside modal card
  document.getElementById("successModal").addEventListener("click", (e) => {
    if (e.target.id === "successModal") {
      closeSuccessModal();
    }
  });

  // Preset Chips selection
  document.querySelectorAll("#presetChips .tag-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      document.querySelectorAll("#presetChips .tag-chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      if (memoInput) {
        memoInput.value = chip.getAttribute("data-text");
        if (charCounter) {
          charCounter.textContent = `${memoInput.value.length}/35`;
        }
        memoInput.focus();
      }
    });
  });

  // Enter key in memo input submits verification
  if (memoInput) {
    memoInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        submitSuccessVerification();
      }
    });
  }

  // Coupang Unlock Modal Event Listeners
  const btnCloseCoupang = document.getElementById("btnCloseCoupangModal");
  if (btnCloseCoupang) btnCloseCoupang.addEventListener("click", closeCoupangModal);

  const btnSkipCoupang = document.getElementById("btnSkipCoupangModal");
  if (btnSkipCoupang) btnSkipCoupang.addEventListener("click", closeCoupangModal);

  const btnCoupangUnlock = document.getElementById("btnCoupangUnlock");
  if (btnCoupangUnlock) btnCoupangUnlock.addEventListener("click", handleCoupangUnlockClick);

  const coupangModal = document.getElementById("coupangUnlockModal");
  if (coupangModal) {
    coupangModal.addEventListener("click", (e) => {
      if (e.target.id === "coupangUnlockModal") {
        closeCoupangModal();
      }
    });
  }

  // Debug Helpers for Local Testing (Console)
  window.__debugSetCoupangAttempts = function(n) {
    const today = getTodayDateString();
    localStorage.setItem(COUPANG_STORAGE_KEYS.DAILY_DATA, JSON.stringify({ date: today, count: n }));
    localStorage.removeItem(COUPANG_STORAGE_KEYS.UNLOCKED_DATE);
    updateQuotaDisplay();
    console.log(`[DEBUG] Set Coupang daily attempts to ${n}`);
  };

  window.__debugResetCoupang = function() {
    localStorage.removeItem(COUPANG_STORAGE_KEYS.DAILY_DATA);
    localStorage.removeItem(COUPANG_STORAGE_KEYS.UNLOCKED_DATE);
    updateQuotaDisplay();
    console.log("[DEBUG] Coupang limit and unlock status reset.");
  };
}
