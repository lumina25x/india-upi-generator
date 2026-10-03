/**
 * POST /api/macro-report
 * 와갈매크로 갱신 성공 이력 수집 API (시도 횟수, 소요시간 등)
 */

const SUPABASE_URL = process.env.SUPABASE_URL || "https://zzikaydhcxknxymkydyw.supabase.co";
const ANON_KEY = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6aWtheWRoY3hrbnh5bWt5ZHl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk3Mzg3NDIsImV4cCI6MjEwNTMxNDc0Mn0.ojlPbcz51N6PadfR6hqIuEz-PkatUppi52vR4Vwv51E";

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch (e) {
        body = {};
      }
    }
    body = body || {};

    // 시도 횟수 유효성 검사 (1회 ~ 500회 제한)
    const attempts = Math.max(1, Math.min(500, parseInt(body.attempts, 10) || 1));
    const durationSec = Math.max(0, parseInt(body.duration_sec, 10) || 0);
    const version = String(body.version || "0.4.0").substring(0, 20);
    const product = String(body.product || "YouTube Premium").substring(0, 50);
    const clientType = ["extension", "bookmarklet", "web_sim"].includes(body.client_type) 
      ? body.client_type 
      : "extension";

    const rawMemo = String(body.memo || "").trim();
    const memo = rawMemo.substring(0, 100);

    const payload = {
      attempts: attempts,
      duration_sec: durationSec,
      version: version,
      product: product,
      currency: "INR",
      client_type: clientType,
      created_at: new Date().toISOString()
    };
    if (memo) payload.memo = memo;

    // 1) Supabase macro_logs 테이블에 삽입 시도 (통계 전용)
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/macro_logs`, {
        method: "POST",
        headers: {
          "apikey": ANON_KEY,
          "Authorization": `Bearer ${ANON_KEY}`,
          "Content-Type": "application/json",
          "Prefer": "return=minimal"
        },
        body: JSON.stringify(payload)
      });
    } catch (dbErr) {
      console.log("macro_logs insert error:", dbErr);
    }

    // 2) 메인 사이트 실시간 성공 후기 피드(upi_logs)에도 즉시 기록
    try {
      const uniqueSuffix = Date.now().toString(36).slice(-4);
      const displayId = `와갈매크로-${attempts}회#${uniqueSuffix}`;
      const finalMemo = memo 
        ? `${memo}` 
        : `와갈매크로 갱신 성공 (${product}, ${attempts}회 시도)`;

      await fetch(`${SUPABASE_URL}/rest/v1/upi_logs`, {
        method: "POST",
        headers: {
          "apikey": ANON_KEY,
          "Authorization": `Bearer ${ANON_KEY}`,
          "Content-Type": "application/json",
          "Prefer": "return=minimal"
        },
        body: JSON.stringify({
          upi_id: displayId,
          type: "SUCCESS",
          timestamp: new Date().toISOString().substring(0, 19).replace('T', ' '),
          memo: finalMemo
        })
      });
    } catch (feedErr) {
      console.log("upi_logs insert error:", feedErr);
    }

    return res.status(200).json({
      status: "success",
      message: "성공 리포트가 정상적으로 기록되었습니다.",
      record: {
        attempts: attempts,
        duration_sec: durationSec,
        version: version,
        recorded_at: payload.created_at
      }
    });
  } catch (err) {
    console.error("Telemetry handler error:", err);
    return res.status(500).json({ error: "Internal Server Error", detail: err.message });
  }
};
