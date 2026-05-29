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

    if (type === 'follow-up-reminder') {
      const { data: sessions } = await supabaseAdmin
        .from('sessions')
        .select('id, title, report')
        .eq('user_id', user.id)
        .not('report', 'is', null);

      const withItems = (sessions || []).filter(s =>
        Array.isArray(s.report?.followUpItems) && s.report.followUpItems.length > 0
      );
      if (withItems.length === 0) return res.status(200).json({ ok: true, skipped: true });

      const count = withItems.reduce((acc, s) => acc + s.report.followUpItems.length, 0);
      const listHtml = withItems.slice(0, 3).map(s =>
        `<li><a href="https://verirec.vercel.app/session/${s.id}" style="color:#2563eb">${s.title || 'Sesi'}</a> — ${s.report.followUpItems.length} item</li>`
      ).join('');

      await sendEmail({
        to: user.email,
        subject: `Peringatan: ${count} tindakan susulan belum selesai`,
        html: `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f8fafc;padding:24px">
          <div style="background:#fff;border-radius:12px;max-width:520px;margin:0 auto;padding:32px;border:1px solid #e2e8f0">
            <h2 style="color:#0f172a;margin:0 0 8px">📋 Tindakan Susulan Belum Selesai</h2>
            <p style="color:#475569">Anda mempunyai <strong>${count} tindakan susulan</strong> yang masih belum diselesaikan:</p>
            <ul style="color:#475569;font-size:14px;line-height:2">${listHtml}</ul>
            <a href="https://verirec.vercel.app/dashboard" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;margin:16px 0">Semak Dashboard →</a>
            <p style="font-size:12px;color:#94a3b8;margin-top:16px">VeriRec · <a href="https://verirec.vercel.app" style="color:#2563eb">verirec.vercel.app</a></p>
          </div></body></html>`,
      });
      return res.status(200).json({ ok: true, sent: true, count });
    }

    return res.status(400).json({ error: 'Unknown notification type' });
  } catch (err) {
    console.error('user-notifications error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
