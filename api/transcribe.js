import { createClient } from '@supabase/supabase-js';
import Busboy from 'busboy';
import { checkRateLimit } from './_rateLimit.js';

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Required: disable Vercel's default bodyParser so we can handle multipart manually
export const config = { api: { bodyParser: false } };

function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const bb = Busboy({ headers: req.headers });
    const fields = {};
    let audioBuffer = null;
    let audioMime = 'audio/webm';

    bb.on('file', (name, stream, info) => {
      audioMime = info.mimeType || 'audio/webm';
      const chunks = [];
      stream.on('data', d => chunks.push(d));
      stream.on('end', () => { audioBuffer = Buffer.concat(chunks); });
    });

    bb.on('field', (name, val) => { fields[name] = val; });
    bb.on('close', () => resolve({ fields, audioBuffer, audioMime }));
    bb.on('error', reject);

    req.pipe(bb);
  });
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

    const rl = await checkRateLimit(user.id, 'transcribe');
    if (!rl.ok) {
      return res.status(429).json({ error: 'Terlalu banyak permintaan. Cuba lagi sebentar.' });
    }

    const { audioBuffer, audioMime } = await parseMultipart(req);
    if (!audioBuffer || audioBuffer.length === 0) {
      return res.status(400).json({ error: 'No audio data received' });
    }

    // Max audio: 25MB (Whisper limit)
    if (audioBuffer.length > 25 * 1024 * 1024) {
      return res.status(413).json({ error: 'Audio chunk too large' });
    }

    const form = new FormData();
    const blob = new Blob([audioBuffer], { type: audioMime });
    form.append('file', blob, 'audio.webm');
    form.append('model', 'whisper-1');
    form.append('language', 'ms');

    const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: form,
    });

    if (!whisperRes.ok) {
      const err = await whisperRes.text();
      console.error('Whisper error:', err);
      return res.status(502).json({ error: 'Transcription service error' });
    }

    const data = await whisperRes.json();
    return res.status(200).json({ text: data.text?.trim() || '', duration: data.duration || 0 });
  } catch (err) {
    console.error('transcribe error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
