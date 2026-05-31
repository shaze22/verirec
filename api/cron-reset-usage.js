import { createClient } from '@supabase/supabase-js';
import { sendEmail, monthlySummaryEmail, appointmentReminderEmail } from './_mailer.js';

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Runs daily at 01:00 UTC
// - Every day: send appointment reminders for tomorrow
// - 1st of month: reset usage + send monthly summary
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const auth = req.headers.authorization;
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const now = new Date();
  const results = { reminders: 0, monthlyReset: false, emailsSent: 0 };

  try {
    // ── 1. Daily: appointment reminders for tomorrow ──
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10);

    const { data: appts } = await supabaseAdmin
      .from('appointments')
      .select('id, client_name, client_email, confirmed_date, confirmed_time, counselor_id')
      .eq('confirmed_date', tomorrowStr)
      .in('status', ['confirmed', 'rescheduled'])
      .not('client_email', 'is', null);

    if (appts?.length) {
      // Get counselor profiles for display names and locations
      const counselorIds = [...new Set(appts.map(a => a.counselor_id))];
      const { data: profiles } = await supabaseAdmin
        .from('counselor_profiles')
        .select('user_id, display_name, klinik_address')
        .in('user_id', counselorIds);

      const profileMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p]));

      const reminderResults = await Promise.allSettled(
        appts.map(async (appt) => {
          if (!appt.client_email) return;
          const counselor = profileMap[appt.counselor_id];
          const counselorName = counselor?.display_name || 'Kaunselor';
          const { subject, html } = appointmentReminderEmail(
            appt.client_name,
            counselorName,
            appt.confirmed_date,
            appt.confirmed_time || '',
            counselor?.klinik_address || ''
          );
          await sendEmail({ to: appt.client_email, subject, html });
        })
      );
      results.reminders = reminderResults.filter(r => r.status === 'fulfilled').length;
    }

    // ── 2. Monthly: reset usage on 1st of month ──
    if (now.getDate() === 1) {
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
      results.emailsSent = emailResults.filter(r => r.status === 'fulfilled').length;

      const { error } = await supabaseAdmin.rpc('reset_monthly_usage');
      if (error) throw error;
      results.monthlyReset = true;
    }

    // ── 3. Daily: prune stale rate_limits ──
    await supabaseAdmin.from('rate_limits')
      .delete()
      .lt('window_start', new Date(Date.now() - 3600_000).toISOString());

    console.log('Cron complete:', results, now.toISOString());
    return res.status(200).json({ ok: true, ...results });
  } catch (err) {
    console.error('cron-reset-usage error:', err);
    return res.status(500).json({ error: err.message });
  }
}
