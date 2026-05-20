// Shared CORS helper for all API routes
// In production, restricts to VITE_APP_URL. In dev, allows all origins.

export function setCors(req, res) {
  const origin = req.headers.origin || '';
  const appUrl = process.env.VITE_APP_URL || '';
  const isDev = appUrl.includes('localhost') || appUrl.includes('127.0.0.1');

  const allowed = isDev ? origin : appUrl;
  res.setHeader('Access-Control-Allow-Origin', allowed || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export function handleOptions(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') { res.status(200).end(); return true; }
  return false;
}
