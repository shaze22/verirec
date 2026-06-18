import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(',').map(e => e.trim()).filter(Boolean);

const PLAN_LIMITS = { free: 2, starter: 20, pro: 100, biz: 200 };

async function verifyAdmin(req) {
  if (ADMIN_EMAILS.length === 0) throw Object.assign(new Error('Admin access not configured'), { status: 503 });
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) throw Object.assign(new Error('Tidak dibenarkan'), { status: 401 });
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) throw Object.assign(new Error('Tidak dibenarkan'), { status: 401 });
  if (!ADMIN_EMAILS.includes(user.email)) throw Object.assign(new Error('Akses ditolak'), { status: 403 });
  return user;
}

async function getData() {
  const [
    { data: { users }, error: usersError },
    { data: subs },
    { count: totalSessions },
    { count: sessionsThisMonth },
  ] = await Promise.all([
    supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
    supabaseAdmin.from('subscriptions').select('*'),
    supabaseAdmin.from('sessions').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('sessions').select('*', { count: 'exact', head: true })
      .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
  ]);
  if (usersError) throw usersError;

  const subMap = Object.fromEntries((subs || []).map(s => [s.user_id, s]));
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);

  const result = users.map(u => ({
    id: u.id,
    email: u.email,
    created_at: u.created_at,
    last_sign_in_at: u.last_sign_in_at,
    banned_until: u.banned_until || null,
    subscription: subMap[u.id] || null,
  }));

  const planCounts = { free: 0, starter: 0, pro: 0, biz: 0 };
  result.forEach(u => { const p = u.subscription?.plan || 'free'; if (p in planCounts) planCounts[p]++; else planCounts.free++; });

  return {
    users: result,
    stats: {
      totalUsers: users.length,
      newThisMonth: users.filter(u => new Date(u.created_at) >= monthStart).length,
      paidUsers: result.filter(u => u.subscription && u.subscription.plan !== 'free').length,
      totalSessions: totalSessions || 0,
      sessionsThisMonth: sessionsThisMonth || 0,
      planCounts,
    },
  };
}

export default async function handler(req, res) {
  try {
    // Self-service account deletion — user auth only, not admin
    if (req.method === 'DELETE') {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) return res.status(401).json({ error: 'Unauthorized' });
      const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
      if (authErr || !user) return res.status(401).json({ error: 'Unauthorized' });

      // Delete all user-owned data in parallel (non-fatal per table)
      // Note: consent_logs are NOT deleted — audit trail must be preserved per PDPA
      await Promise.allSettled([
        supabaseAdmin.from('sessions').delete().eq('user_id', user.id),
        supabaseAdmin.from('subscriptions').delete().eq('user_id', user.id),
        supabaseAdmin.from('subjects').delete().eq('user_id', user.id),
        supabaseAdmin.from('cases').delete().eq('user_id', user.id),
        supabaseAdmin.from('scheduled_sessions').delete().eq('user_id', user.id),
        supabaseAdmin.from('question_templates').delete().eq('user_id', user.id),
        supabaseAdmin.from('audio_library').delete().eq('user_id', user.id),
        supabaseAdmin.from('referrals').delete().eq('referrer_id', user.id),
        supabaseAdmin.from('audit_logs').delete().eq('user_id', user.id),
        // Counselor-specific tables
        supabaseAdmin.from('counselor_profiles').delete().eq('user_id', user.id),
        supabaseAdmin.from('appointment_slots').delete().eq('counselor_id', user.id),
        supabaseAdmin.from('appointments').delete().eq('counselor_id', user.id),
        supabaseAdmin.from('counselor_invoices').delete().eq('user_id', user.id),
        supabaseAdmin.from('progress_notes').delete().eq('user_id', user.id),
        supabaseAdmin.from('action_plans').delete().eq('user_id', user.id),
        supabaseAdmin.from('client_assessments').delete().eq('user_id', user.id),
        supabaseAdmin.from('client_intake_forms').delete().eq('user_id', user.id),
        supabaseAdmin.from('client_homework').delete().eq('user_id', user.id),
        supabaseAdmin.from('supervision_sessions').delete().eq('user_id', user.id),
        supabaseAdmin.from('kaunselor_audit_logs').delete().eq('user_id', user.id),
      ]);

      // Storage cleanup (non-fatal)
      try {
        const { data: recFiles } = await supabaseAdmin.storage.from('recordings').list(user.id);
        if (recFiles?.length) {
          await supabaseAdmin.storage.from('recordings').remove(recFiles.map(f => `${user.id}/${f.name}`));
        }
        const { data: evFiles } = await supabaseAdmin.storage.from('evidence').list(user.id);
        if (evFiles?.length) {
          await supabaseAdmin.storage.from('evidence').remove(evFiles.map(f => `${user.id}/${f.name}`));
        }
      } catch (storageErr) { console.error('Storage cleanup error:', storageErr); }

      // Delete auth user last
      const { error: deleteErr } = await supabaseAdmin.auth.admin.deleteUser(user.id);
      if (deleteErr) throw deleteErr;

      return res.status(200).json({ ok: true });
    }

    await verifyAdmin(req);

    if (req.method === 'GET') {
      return res.status(200).json(await getData());
    }

    if (req.method === 'POST') {
      const body = await readBody(req);
      const { action, userId, plan, subject, message } = body;

      if (action === 'update-plan') {
        if (!userId || !plan || !(plan in PLAN_LIMITS)) return res.status(400).json({ error: 'Parameter tidak sah' });
        const { data, error } = await supabaseAdmin.from('subscriptions')
          .update({ plan, sessions_limit: PLAN_LIMITS[plan], updated_at: new Date().toISOString() })
          .eq('user_id', userId).select().single();
        if (error) throw error;
        return res.status(200).json({ subscription: data });
      }

      if (action === 'reset-sessions') {
        if (!userId) return res.status(400).json({ error: 'userId diperlukan' });
        const { data, error } = await supabaseAdmin.from('subscriptions')
          .update({ sessions_used: 0, warning_sent: false, updated_at: new Date().toISOString() })
          .eq('user_id', userId).select().single();
        if (error) throw error;
        return res.status(200).json({ subscription: data });
      }

      if (action === 'send-email') {
        if (!userId || !subject?.trim() || !message?.trim()) return res.status(400).json({ error: 'Parameter tidak sah' });
        const { data: { user: target } } = await supabaseAdmin.auth.admin.getUserById(userId);
        if (!target) return res.status(404).json({ error: 'Pengguna tidak dijumpai' });
        const key = process.env.RESEND_API_KEY;
        if (!key) return res.status(500).json({ error: 'RESEND_API_KEY tidak dikonfigurasi' });
        const from = process.env.EMAIL_FROM || 'VeriRec <onboarding@resend.dev>';
        const html = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:24px">
            <div style="background:#2563eb;border-radius:8px;width:32px;height:32px;display:flex;align-items:center;justify-content:center">
              <span style="color:white;font-weight:bold;font-size:14px">V</span>
            </div>
            <span style="font-weight:700;color:#1e293b;font-size:16px">VeriRec</span>
          </div>
          <h2 style="color:#1e293b;margin-bottom:16px">${subject}</h2>
          <div style="background:#f8fafc;border-radius:10px;padding:20px;color:#334155;line-height:1.6">
            ${message.replace(/\n/g, '<br>')}
          </div>
          <p style="color:#94a3b8;font-size:12px;margin-top:24px">E-mel ini dihantar daripada pasukan VeriRec kepada ${target.email}.</p>
        </div>`;
        const r = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
          body: JSON.stringify({ from, to: target.email, subject, html }),
        });
        if (!r.ok) { const e = await r.json(); throw new Error(e.message || 'Gagal hantar e-mel'); }
        return res.status(200).json({ ok: true });
      }

      if (action === 'get-consent-logs') {
        if (!userId) return res.status(400).json({ error: 'userId diperlukan' });
        const { data, error } = await supabaseAdmin.from('consent_logs')
          .select('id, decision, user_agent, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        if (error) throw error;
        return res.status(200).json({ logs: data || [] });
      }

      if (action === 'export-user') {
        if (!userId) return res.status(400).json({ error: 'userId diperlukan' });
        const [
          { data: { user: authUser } },
          { data: sessions },
          { data: subscription },
          { data: consentLogs },
          { data: auditLogs },
        ] = await Promise.all([
          supabaseAdmin.auth.admin.getUserById(userId),
          supabaseAdmin.from('sessions').select('id, title, profession, subject_name, created_at, duration, recording_status').eq('user_id', userId),
          supabaseAdmin.from('subscriptions').select('plan, sessions_used, sessions_limit, created_at, updated_at').eq('user_id', userId).maybeSingle(),
          supabaseAdmin.from('consent_logs').select('decision, created_at, user_agent').eq('user_id', userId).order('created_at', { ascending: false }),
          supabaseAdmin.from('audit_logs').select('action, resource_type, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(200),
        ]);
        return res.status(200).json({
          exported_at: new Date().toISOString(),
          user: { id: authUser?.id, email: authUser?.email, created_at: authUser?.created_at, last_sign_in_at: authUser?.last_sign_in_at },
          subscription: subscription || null,
          sessions: sessions || [],
          consent_logs: consentLogs || [],
          audit_logs: auditLogs || [],
        });
      }

      if (action === 'suspend-user') {
        if (!userId) return res.status(400).json({ error: 'userId diperlukan' });
        const { data: { user: updated }, error } = await supabaseAdmin.auth.admin.updateUserById(userId, { ban_duration: '876000h' });
        if (error) throw error;
        return res.status(200).json({ banned_until: updated.banned_until });
      }

      if (action === 'unsuspend-user') {
        if (!userId) return res.status(400).json({ error: 'userId diperlukan' });
        const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { ban_duration: 'none' });
        if (error) throw error;
        return res.status(200).json({ banned_until: null });
      }

      return res.status(400).json({ error: 'Action tidak dikenali' });
    }

    return res.status(405).end();
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}); } catch { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}
