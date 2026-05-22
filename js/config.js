// Supabase 配置
const SUPABASE_URL = 'https://zddtigvlvchuhxwvpsca.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkZHRpZ3ZsdmNodWh4d3Zwc2NhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NTE4MTMsImV4cCI6MjA5NTAyNzgxM30.xmXi53L7AbrmXlffBvGz-jcrQ0ozUK57q3g1ms_Rx5c';

// 封装 REST API 请求（绕过 CDN，直接调 Supabase API）
async function supabaseFetch(path, options = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    ...options.headers
  };
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const err = new Error(`Supabase API error: ${res.status}`);
    err.status = res.status;
    throw err;
  }
  if (res.status === 204 || res.headers.get('content-length') === '0') return null;
  return res.json();
}
