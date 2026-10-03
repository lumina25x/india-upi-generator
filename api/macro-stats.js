/**
 * GET /api/macro-stats
 * 와갈매크로 실시간 갱신 성공 통계 (평균 시도 횟수, 누적 성공수, 최근 성공 피드)
 */

const SUPABASE_URL = process.env.SUPABASE_URL || "https://zzikaydhcxknxymkydyw.supabase.co";
const ANON_KEY = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6aWtheWRoY3hrbnh5bWt5ZHl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk3Mzg3NDIsImV4cCI6MjEwNTMxNDc0Mn0.ojlPbcz51N6PadfR6hqIuEz-PkatUppi52vR4Vwv51E";

function formatRelativeTime(date) {
  const diffMs = Date.now() - new Date(date).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "방금 전";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}시간 전`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}일 전`;
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "public, s-maxage=30, stale-while-revalidate=120");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // 기본 통계 (실시간 DB 기록 기반 - 가짜 모의 데이터 제거)
  let stats = {
    status: "ok",
    totalSuccessCount: 0,
    averageAttempts: "-",
    recentSuccesses: [],
    source: "database"
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    // upi_logs 테이블에서 와갈매크로 갱신 성공 내역 실시간 조회
    const dbRes = await fetch(
      `${SUPABASE_URL}/rest/v1/upi_logs?type=eq.SUCCESS&upi_id=ilike.${encodeURIComponent("와갈매크로*")}&order=created_at.desc&limit=100`,
      {
        headers: {
          apikey: ANON_KEY,
          Authorization: `Bearer ${ANON_KEY}`
        },
        signal: controller.signal
      }
    );
    clearTimeout(timeout);

    if (dbRes.ok) {
      const rows = await dbRes.json();
      if (Array.isArray(rows) && rows.length > 0) {
        const attemptList = rows.map(r => {
          const idMatch = String(r.upi_id || "").match(/와갈매크로-(\d+)회/);
          if (idMatch && idMatch[1]) return parseInt(idMatch[1], 10);
          const memoMatch = String(r.memo || "").match(/(\d+)회/);
          if (memoMatch && memoMatch[1]) return parseInt(memoMatch[1], 10);
          return 1;
        }).filter(n => !isNaN(n) && n > 0);

        const sum = attemptList.reduce((acc, cur) => acc + cur, 0);
        const avg = attemptList.length > 0 ? (sum / attemptList.length).toFixed(1) : "-";

        stats.totalSuccessCount = rows.length;
        stats.averageAttempts = avg !== "-" ? parseFloat(avg) : "-";

        stats.recentSuccesses = rows.map((r, idx) => {
          const attempts = attemptList[idx] || 1;
          let product = "YouTube Premium";
          if (r.memo) {
            if (/Family|패밀리/i.test(r.memo)) product = "YouTube Premium Family";
            else if (/Two-person|2인|듀오/i.test(r.memo)) product = "YouTube Premium Two-person";
            else if (/Music|뮤직/i.test(r.memo)) product = "YouTube Music";
          }
          return {
            id: r.id,
            upi_id: r.upi_id,
            attempts: attempts,
            timeAgo: formatRelativeTime(r.created_at),
            memo: r.memo || `${attempts}회 시도 갱신 성공`,
            product: product,
            timestamp: r.timestamp || ""
          };
        });
        stats.source = "live_database";
      } else {
        stats.totalSuccessCount = 0;
        stats.averageAttempts = "-";
        stats.recentSuccesses = [];
        stats.source = "clean_initial";
      }
    }
  } catch (err) {
    console.error("macro-stats error:", err);
    stats.source = "error_fallback";
  }

  return res.status(200).json(stats);
};
