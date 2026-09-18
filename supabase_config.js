/**
 * Supabase Database Configuration
 */

const SUPABASE_CONFIG = {
  url: "https://zzikaydhcxknxymkydyw.supabase.co",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6aWtheWRoY3hrbnh5bWt5ZHl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk3Mzg3NDIsImV4cCI6MjEwNTMxNDc0Mn0.ojlPbcz51N6PadfR6hqIuEz-PkatUppi52vR4Vwv51E",
  tableName: "upi_logs"
};

// localStorage에 저장된 개발용 키가 있다면 우선 적용
(function initStoredSupabaseConfig() {
  try {
    const stored = localStorage.getItem("upi_supabase_dev_config");
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.url && parsed.anonKey) {
        SUPABASE_CONFIG.url = parsed.url;
        SUPABASE_CONFIG.anonKey = parsed.anonKey;
      }
    }
  } catch (e) {}
})();
