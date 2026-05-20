import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import crypto from 'crypto';

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

    const body = await readBody(req);
    const { session_id, transcript, flags, session_info } = body;

    if (!session_id || !transcript) return res.status(400).json({ error: 'Missing required fields' });

    const { data: session, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('id, user_id')
      .eq('id', session_id)
      .eq('user_id', user.id)
      .single();

    if (sessionError || !session) return res.status(403).json({ error: 'Forbidden' });

    const transcriptText = transcript
      .filter(e => e.type === 'TRANSCRIPT')
      .map(e => `[${e.speaker || 'Tidak diketahui'}]: ${e.text}`)
      .join('\n');

    const message = await anthropic.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: `Anda adalah penganalisis temuduga profesional untuk ${session_info?.profession || 'umum'} Malaysia.

Maklumat sesi:
- Penemuduga: ${session_info?.interviewer || 'Tidak diketahui'}
- Subjek: ${session_info?.subject_name || 'Tidak diketahui'} (${session_info?.subject_role || ''})
- Konteks: ${session_info?.context_notes || 'Tiada'}
- Tempoh: ${Math.round((session_info?.duration || 0) / 60)} minit

Transkrip:
${transcriptText}

Bendera yang ditanda:
${flags?.map(f => `- ${f.text}`).join('\n') || '(tiada)'}

Balas dalam JSON sahaja:
{
  "summary": "ringkasan eksekutif 2-3 ayat",
  "keyFindings": ["penemuan 1", "penemuan 2", "penemuan 3"],
  "riskLevel": "low|medium|high",
  "riskJustification": "sebab tahap risiko",
  "sentiment": "positive|neutral|negative",
  "sentimentNote": "nota berkaitan sentimen",
  "recommendations": ["cadangan 1", "cadangan 2"],
  "redFlags": ["bendera merah jika ada"],
  "followUpRequired": true,
  "followUpReason": "sebab susulan diperlukan jika ada"
}

Semua teks dalam Bahasa Malaysia.`
      }]
    });

    const text = message.content[0].text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(500).json({ error: 'Invalid AI response' });

    const report = JSON.parse(jsonMatch[0]);
    const timestamp = new Date().toISOString();

    const hashPayload = JSON.stringify({ report, transcript, session_id, timestamp });
    const hash = crypto.createHash('sha256').update(hashPayload).digest('hex');

    await supabaseAdmin
      .from('sessions')
      .update({ report, hash, updated_at: new Date().toISOString() })
      .eq('id', session_id);

    return res.status(200).json({ report, hash, timestamp });
  } catch (err) {
    console.error('report error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(data)); } catch { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}
