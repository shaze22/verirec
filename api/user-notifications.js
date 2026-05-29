import { createClient } from '@supabase/supabase-js';
import { sendEmail, welcomeEmail, limitWarningEmail } from './_mailer.js';

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

    const type = req.query.type || req.body?.type;

    if (type === 'welcome') {
      const name = user.user_metadata?.full_name || user.email?.split('@')[0];
      const { subject, html } = welcomeEmail(name);
      await sendEmail({ to: user.email, subject, html });
      return res.status(200).json({ ok: true });
    }

    if (type === 'limit-warning') {
      const { data: sub } = await supabaseAdmin
        .from('subscriptions')
        .select('sessions_used, sessions_limit, warning_sent')
        .eq('user_id', user.id)
        .single();

      if (!sub || sub.sessions_limit === -1) return res.status(200).json({ ok: true });

      const pct = sub.sessions_used / sub.sessions_limit;
      if (pct < 0.8 || sub.warning_sent) return res.status(200).json({ ok: true, skipped: true });

      const { subject, html } = limitWarningEmail(sub.sessions_used, sub.sessions_limit);
      await sendEmail({ to: user.email, subject, html });

      await supabaseAdmin.from('subscriptions')
        .update({ warning_sent: true })
        .eq('user_id', user.id);

      return res.status(200).json({ ok: true, sent: true });
    }

    return res.status(400).json({ error: 'Unknown notification type' });
  } catch (err) {
    console.error('user-notifications error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
