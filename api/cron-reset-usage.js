import { createClient } from '@supabase/supabase-js';
import { sendEmail, monthlySummaryEmail } from './_mailer.js';

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Called by Vercel cron on 1st of every month at 00:00 UTC
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const auth = req.headers.authorization;
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // 1. Send monthly summary emails before resetting usage
    const { data: subs } = await supabaseAdmin
      .from('subscriptions')
      .select('user_id, sessions_used, sessions_limit, plan')
      .gt('sessions_used', 0);

    const emailResults = await Promise.allSettled(
      (subs || []).map(async (sub) => {
        const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(sub.user_id);
        if (!user?.email) return;
        const name = user.user_metadata?.full_name || user.email.split('@')[0];
        const { subject, html } = monthlySummaryEmail(name, sub.sessions_used, sub.sessions_limit, sub.plan);
        await sendEmail({ to: user.email, subject, html });
      })
    );
    const sent = emailResults.filter(r => r.status === 'fulfilled').length;

    // 2. Reset monthly usage counters
    const { error } = await supabaseAdmin.rpc('reset_monthly_usage');
    if (error) throw error;

    // 3. Prune stale rate_limits records
    await supabaseAdmin.from('rate_limits')
      .delete()
      .lt('window_start', new Date(Date.now() - 3600_000).toISOString());

    console.log(`Monthly reset complete: ${sent} summary emails sent`, new Date().toISOString());
    return res.status(200).json({ ok: true, emailsSent: sent });
  } catch (err) {
    console.error('cron-reset-usage error:', err);
    return res.status(500).json({ error: err.message });
  }
}
