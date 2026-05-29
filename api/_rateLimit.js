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
    const { data: existing } = await supabaseAdmin
      .from('rate_limits')
      .select('id, count')
      .eq('user_id', userId)
      .eq('endpoint', endpoint)
      .eq('window_start', windowStart)
      .maybeSingle();

    if (!existing) {
      await supabaseAdmin.from('rate_limits').insert({
        user_id: userId, endpoint, window_start: windowStart, count: 1,
      });
      return { ok: true };
    }

    if (existing.count >= limit.max) {
      return { ok: false, retryAfter: Math.ceil(limit.windowMs / 1000) };
    }

    await supabaseAdmin.from('rate_limits')
      .update({ count: existing.count + 1 })
      .eq('id', existing.id);

    return { ok: true };
  } catch {
    return { ok: true }; // fail open — never block on DB error
  }
}
