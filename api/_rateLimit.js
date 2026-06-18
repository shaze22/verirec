import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Max requests per window per authenticated user
const LIMITS = {
  transcribe: { max: 15, windowMs: 60_000 },   // 15/min — Whisper is expensive
  suggest:    { max: 30, windowMs: 60_000 },   // 30/min
  report:     { max: 5,  windowMs: 300_000 },  // 5 per 5 min
};

export async function checkRateLimit(userId, endpoint) {
  const limit = LIMITS[endpoint];
  if (!limit) return { ok: true };

  const windowStart = new Date(
    Math.floor(Date.now() / limit.windowMs) * limit.windowMs
  ).toISOString();

  try {
    const { data, error } = await supabaseAdmin.rpc('increment_rate_limit', {
      p_user_id: userId,
      p_endpoint: endpoint,
      p_window_start: windowStart,
      p_max_count: limit.max,
    });

    if (error) throw error;
    const allowed = data?.[0]?.allowed ?? true;
    if (!allowed) return { ok: false, retryAfter: Math.ceil(limit.windowMs / 1000) };
    return { ok: true };
  } catch {
    return { ok: true }; // fail open — never block on DB error
  }
}
