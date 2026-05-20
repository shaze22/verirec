import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import crypto from 'crypto';

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const cache = new Map();

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('plan')
      .eq('user_id', user.id)
      .single();

    const planOrder = { free: 0, starter: 1, pro: 2, biz: 3 };
    if ((planOrder[sub?.plan] || 0) < planOrder['starter']) {
      return res.status(402).json({ error: 'plan_required', required: 'starter' });
    }

    const body = await readBody(req);
    const { profession, phase, question, recent_transcript = [] } = body;

    if (!profession || !question) return res.status(400).json({ error: 'Missing required fields' });

    const cacheKey = crypto
      .createHash('sha256')
      .update(`${profession}|${phase}|${question}`)
      .digest('hex');

    if (cache.has(cacheKey)) {
      const cached = cache.get(cacheKey);
      if (Date.now() - cached.ts < 10 * 60 * 1000) {
        return res.status(200).json(cached.data);
      }
      cache.delete(cacheKey);
    }

    const transcriptText = recent_transcript.slice(-5).join('\n');

    const message = await anthropic.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: `Anda adalah pembantu temuduga profesional untuk ${profession} Malaysia.
Fasa semasa: ${phase}
Soalan terkini: "${question}"
Petikan transkrip terkini:
${transcriptText || '(tiada lagi)'}

Balas dalam JSON sahaja (tiada teks lain):
{
  "followUp": ["soalan susulan 1", "soalan susulan 2", "soalan susulan 3"],
  "observation": "pemerhatian ringkas tentang jawapan",
  "redFlag": false,
  "redFlagNote": ""
}

Semua teks dalam Bahasa Malaysia. Jika ada petanda kebimbangan serius, set redFlag: true.`
      }]
    });

    const text = message.content[0].text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(500).json({ error: 'Invalid AI response' });

    const data = JSON.parse(jsonMatch[0]);
    cache.set(cacheKey, { data, ts: Date.now() });

    return res.status(200).json(data);
  } catch (err) {
    console.error('suggest error:', err);
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
