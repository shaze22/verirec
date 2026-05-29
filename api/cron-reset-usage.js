import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Called by Vercel cron on 1st of every month at 00:00 UTC
// Vercel automatically sends Authorization: Bearer CRON_SECRET
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const auth = req.headers.authorization;
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { error } = await supabaseAdmin.rpc('reset_monthly_usage');
    if (error) throw error;

    // Also prune old rate_limits records
    await supabaseAdmin.from('rate_limits')
      .delete()
      .lt('window_start', new Date(Date.now() - 3600_000).toISOString());

    console.log('Monthly usage reset complete:', new Date().toISOString());
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('cron-reset-usage error:', err);
    return res.status(500).json({ error: err.message });
  }
}
