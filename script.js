/**
 * 인도 UPI ID 자동 생성기 & 성공/실패 피드백 관리 시스템
 */

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
  successList: [], // array of { id, timestamp }
  failedList: [],  // array of { id, timestamp }
  failedSet: new Set(), // Set of strings for O(1) candidate exclusion lookup
  totalCount: 0
};

// ==========================================================================
// 3. Initialization
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
  loadStoredData();
  bindEvents();
  updateStats();
  renderLists();
});

function loadStoredData() {
  try {
    const storedSuccess = localStorage.getItem(STORAGE_KEYS.SUCCESS);
    if (storedSuccess) {
      const parsed = JSON.parse(storedSuccess);
      state.successList = parsed.map(item => {
        if (typeof item === "string") return { id: item, timestamp: getFormattedNow() };
        if (item.timestamp) return item;
        return { id: item.id, timestamp: `${item.date || ''} ${item.time || ''}`.trim() || getFormattedNow() };
      });
    }

    const storedFailed = localStorage.getItem(STORAGE_KEYS.FAILED);
    if (storedFailed) {
      const parsed = JSON.parse(storedFailed);
      state.failedList = parsed.map(item => {
        if (typeof item === "string") return { id: item, timestamp: getFormattedNow() };
        return item;
      });
      state.failedSet = new Set(state.failedList.map(f => f.id));
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
// 5. UI Update & Actions
// ==========================================================================
function handleGenerateClick() {
  const candidate = generateUniqueUpiId();
  if (!candidate) {
    showToast("사용 가능한 조합을 생성하지 못했습니다. 설정을 변경해 보세요.", "fail");
    return;
  }

  state.currentId = candidate.id;
  state.currentMeta = candidate;
  state.totalCount++;
  saveStoredData();

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

  showToast(`⛔ 제외 목록에 등록되었습니다. 다음 생성 시 제외됩니다.`, "fail");

  // Automatically generate a new candidate right away!
  handleGenerateClick();
}

// ==========================================================================
// 6. Batch Generation
// ==========================================================================
function handleBatchGenerate(count) {
  const batchListElem = document.getElementById("batchList");
  const batchSection = document.getElementById("batchSection");
  batchListElem.innerHTML = "";

  const generatedList = [];
  let attempts = 0;

  while (generatedList.length < count && attempts < count * 20) {
    const item = generateUniqueUpiId();
    if (!generatedList.some(g => g.id === item.id)) {
      generatedList.push(item);
    }
    attempts++;
  }

  generatedList.forEach(item => {
    const itemDiv = document.createElement("div");
    itemDiv.className = "batch-item";
    itemDiv.innerHTML = `
      <span>${item.id}</span>
      <button class="copy-mini" title="복사" data-id="${item.id}">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
      </button>
    `;
    batchListElem.appendChild(itemDiv);
  });

  // Attach event listener for batch copy buttons
  batchListElem.querySelectorAll(".copy-mini").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const idToCopy = e.currentTarget.getAttribute("data-id");
      copyTextToClipboard(idToCopy);
      showToast(`복사됨: ${idToCopy}`, "info");
    });
  });

  batchSection.style.display = "block";
  batchSection.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/[&<>"']/g, m => ({
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
          <button class="btn-item-action delete" data-index="${index}" title="삭제">
            ✕
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
        <div class="item-actions">
          <button class="btn-item-action delete" data-id="${item.id}" data-index="${index}" title="제외 해제">
            ✕
          </button>
        </div>
      `;
      failedListElem.appendChild(li);
    });
  }

  // Bind item action listeners
  successListElem.querySelectorAll(".btn-item-action.copy").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const text = e.currentTarget.getAttribute("data-id");
      copyTextToClipboard(text);
      showToast(`복사됨: ${text}`, "info");
    });
  });

  successListElem.querySelectorAll(".btn-item-action.delete").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const idx = parseInt(e.currentTarget.getAttribute("data-index"), 10);
      state.successList.splice(idx, 1);
      saveStoredData();
      updateStats();
      renderLists();
    });
  });

  failedListElem.querySelectorAll(".btn-item-action.delete").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const id = e.currentTarget.getAttribute("data-id");
      const idx = parseInt(e.currentTarget.getAttribute("data-index"), 10);
      state.failedSet.delete(id);
      state.failedList.splice(idx, 1);
      saveStoredData();
      updateStats();
      renderLists();
      showToast(`제외 목록에서 삭제되었습니다 (${id})`, "info");
    });
  });
}

function updateStats() {
  document.getElementById("statTotalCount").textContent = state.totalCount;
  document.getElementById("statSuccessCount").textContent = state.successList.length;
  document.getElementById("statFailedCount").textContent = state.failedList.length;

  document.getElementById("successCounter").textContent = state.successList.length;
  document.getElementById("failedCounter").textContent = state.failedList.length;
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
  document.getElementById("btnGenerate").addEventListener("click", handleGenerateClick);
  document.getElementById("btnCopy").addEventListener("click", handleCopyClick);
  document.getElementById("btnMarkSuccess").addEventListener("click", handleSuccessClick);
  document.getElementById("btnMarkFail").addEventListener("click", handleFailClick);

  // Batch Generation Buttons
  document.querySelectorAll(".btn-batch").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const count = parseInt(e.currentTarget.getAttribute("data-count"), 10);
      handleBatchGenerate(count);
    });
  });

  document.getElementById("btnCloseBatch").addEventListener("click", () => {
    document.getElementById("batchSection").style.display = "none";
  });

  // Export Success List
  document.getElementById("btnExportSuccess").addEventListener("click", () => {
    if (state.successList.length === 0) {
      showToast("내보낼 성공 목록이 없습니다.", "info");
      return;
    }
    const textData = state.successList.map(item => item.id).join("\n");
    const blob = new Blob([textData], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `upi_success_ids_${new Date().toISOString().slice(0,10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("성공 목록이 텍스트 파일로 저장되었습니다.", "success");
  });

  // Clear Failed List
  document.getElementById("btnClearFailed").addEventListener("click", () => {
    if (state.failedList.length === 0) return;
    if (confirm("제외(실패) 목록을 전부 초기화하시겠습니까?")) {
      state.failedSet.clear();
      state.failedList = [];
      saveStoredData();
      updateStats();
      renderLists();
      showToast("실패 목록이 초기화되었습니다.", "info");
    }
  });

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
      const memoInput = document.getElementById("successMemoInput");
      memoInput.value = chip.getAttribute("data-text");
      memoInput.focus();
    });
  });

  // Enter key in memo input submits verification
  document.getElementById("successMemoInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submitSuccessVerification();
    }
  });
}
