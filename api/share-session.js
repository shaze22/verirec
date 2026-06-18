import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { setCors } from './_cors.js';

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    return res.status(200).end();
  }

  // GET: public fetch by share token — intentionally allows any origin so shared reports are embeddable
  if (req.method === 'GET') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: 'token required' });

    const { data: session, error } = await supabaseAdmin
      .from('sessions')
      .select('id, title, profession, subject_name, subject_role, case_number, interviewer, duration, created_at, report, flags')
      .eq('share_token', token)
      .single();

    if (error || !session) return res.status(404).json({ error: 'Laporan tidak dijumpai atau pautan tidak sah.' });
    return res.status(200).json({ session });
  }

  // All other methods: restrict to allowed platform origins and require auth
  setCors(req, res);

  const authToken = req.headers.authorization?.replace('Bearer ', '');
  if (!authToken) return res.status(401).json({ error: 'Unauthorized' });
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(authToken);
  if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

  // POST: generate (or return existing) share token
  if (req.method === 'POST') {
    const { session_id } = req.body || {};
    if (!session_id) return res.status(400).json({ error: 'session_id required' });

    const { data: s } = await supabaseAdmin
      .from('sessions')
      .select('id, share_token')
      .eq('id', session_id)
      .eq('user_id', user.id)
      .single();

    if (!s) return res.status(403).json({ error: 'Forbidden' });
    if (s.share_token) return res.status(200).json({ token: s.share_token });

    const token = crypto.randomBytes(20).toString('hex');
    const { error: saveErr } = await supabaseAdmin.from('sessions')
      .update({ share_token: token })
      .eq('id', session_id)
      .eq('user_id', user.id);
    if (saveErr) return res.status(500).json({ error: 'Failed to save share token' });
    return res.status(200).json({ token });
  }

  // DELETE: revoke share token
  if (req.method === 'DELETE') {
    const { session_id } = req.body || {};
    if (!session_id) return res.status(400).json({ error: 'session_id required' });

    await supabaseAdmin.from('sessions')
      .update({ share_token: null })
      .eq('id', session_id)
      .eq('user_id', user.id);
    return res.status(200).json({ ok: true });
  }

  return res.status(405).end();
}
