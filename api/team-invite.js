import { createClient } from '@supabase/supabase-js';
import { sendEmail, teamInviteEmail } from './_mailer.js';

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const ROLE_LABELS = { admin: 'Admin', interviewer: 'Penemuduga', viewer: 'Penonton' };

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Tidak dibenarkan' });

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: 'Tidak dibenarkan' });

    const body = await readBody(req);
    const { teamName, inviteeEmail, role = 'interviewer' } = body || {};

    if (!teamName?.trim() || !inviteeEmail?.trim()) {
      return res.status(400).json({ error: 'teamName dan inviteeEmail diperlukan' });
    }

    const inviterName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Rakan pasukan';
    const roleLabel = ROLE_LABELS[role] || 'Penemuduga';

    const { subject, html } = teamInviteEmail(inviterName, teamName.trim(), roleLabel);
    await sendEmail({ to: inviteeEmail.trim(), subject, html });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('team-invite error:', err);
    return res.status(500).json({ error: 'Gagal menghantar e-mel jemputan' });
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => { try { resolve(JSON.parse(data)); } catch { reject(new Error('Invalid JSON')); } });
    req.on('error', reject);
  });
}
