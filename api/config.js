/**
 * GET /api/config
 * 원격 동적 설정 API (쿠팡 파트너스 링크, 고잉버스 링크, 와갈매크로 버전 및 공지)
 */

const SUPABASE_URL = process.env.SUPABASE_URL || "https://zzikaydhcxknxymkydyw.supabase.co";
const ANON_KEY = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6aWtheWRoY3hrbnh5bWt5ZHl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk3Mzg3NDIsImV4cCI6MjEwNTMxNDc0Mn0.ojlPbcz51N6PadfR6hqIuEz-PkatUppi52vR4Vwv51E";

const DEFAULT_CONFIGS = {
  affiliates: {
    coupang: {
      url: "https://link.coupang.com/a/g03lOjRufc",
      subId: "indouidid",
      active: true
    },
    goingbus: {
      url: "https://goingbus.com?s=1kO9X8Oz",
      code: "1kO9X8Oz",
      active: true
    }
  },
  macro: {
    latestVersion: "0.4.0",
    downloadUrl: "https://india-upi.vercel.app/wagal-macro-0.4.0.zip",
    minSupportedVersion: "0.3.0",
    killSwitch: false,
    recommendedAttempts: 15,
    recommendedIntervalSec: 25,
    notice: {
      active: true,
      title: "와갈매크로 v0.4.0 최신 배포 안내",
      message: "애플 넷뱅킹 와리가리 갱신을 지원하는 v0.4.0 버전이 배포되었습니다."
    }
  }
};

module.exports = async function handler(req, res) {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const responseData = {
    status: "ok",
    timestamp: new Date().toISOString(),
    ...DEFAULT_CONFIGS
  };

  // Supabase app_configs 테이블에서 동적 오버라이드 조회 시도
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    const dbRes = await fetch(`${SUPABASE_URL}/rest/v1/app_configs?select=key,value`, {
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${ANON_KEY}`
      },
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (dbRes.ok) {
      const rows = await dbRes.json();
      if (Array.isArray(rows) && rows.length > 0) {
        rows.forEach(row => {
          if (row.key === "coupang" && row.value) responseData.affiliates.coupang = row.value;
          if (row.key === "goingbus" && row.value) responseData.affiliates.goingbus = row.value;
          if (row.key === "macro_meta" && row.value) Object.assign(responseData.macro, row.value);
          if (row.key === "emergency_notice" && row.value) responseData.macro.notice = row.value;
        });
        responseData.source = "database";
      } else {
        responseData.source = "defaults";
      }
    } else {
      responseData.source = "defaults";
    }
  } catch (err) {
    responseData.source = "defaults_fallback";
  }

  return res.status(200).json(responseData);
};
