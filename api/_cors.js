// Shared CORS helper for all API routes
// In production, restricts to allowed platform origins. In dev, allows all origins.

const ALLOWED_ORIGINS = new Set([
  'https://www.verirec.app',
  'https://verirec.app',
  'https://counselor.verirec.app',
  'https://kaunselor.app',
  'https://www.kaunselor.app',
]);

export function setCors(req, res) {
  const origin = req.headers.origin || '';
  const appUrl = process.env.VITE_APP_URL || '';
  const isDev = appUrl.includes('localhost') || appUrl.includes('127.0.0.1');

  const allowed = isDev ? origin : (ALLOWED_ORIGINS.has(origin) ? origin : '');
  if (allowed) res.setHeader('Access-Control-Allow-Origin', allowed);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export function handleOptions(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') { res.status(200).end(); return true; }
  return false;
}
