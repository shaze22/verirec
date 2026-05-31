import { createClient } from '@supabase/supabase-js';
import Busboy from 'busboy';
import { checkRateLimit } from './_rateLimit.js';

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

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

async function authUser(req) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

// GET /api/transcribe?job_id=xxx — poll AssemblyAI diarization job
async function handlePoll(req, res) {
  const user = await authUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const job_id = req.query?.job_id;
  if (!job_id) return res.status(400).json({ error: 'Missing job_id' });

  if (!process.env.ASSEMBLYAI_API_KEY) {
    return res.status(503).json({ error: 'AssemblyAI not configured' });
  }

  try {
    const r = await fetch(`https://api.assemblyai.com/v2/transcript/${job_id}`, {
      headers: { Authorization: process.env.ASSEMBLYAI_API_KEY },
    });
    const data = await r.json();

    if (data.status === 'completed') {
      // Map AssemblyAI utterances to VeriRec format
      const utterances = (data.utterances || []).map(u => ({
        speaker: u.speaker,  // 'A', 'B', 'C'…
        text: u.text,
        start: u.start,
        end: u.end,
      }));
      return res.status(200).json({ status: 'completed', utterances });
    }

    if (data.status === 'error') {
      return res.status(502).json({ status: 'error', error: data.error || 'AssemblyAI error' });
    }

    return res.status(200).json({ status: data.status }); // 'queued' | 'processing'
  } catch (err) {
    console.error('poll error:', err);
    return res.status(500).json({ error: 'Poll failed' });
  }
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') return handlePoll(req, res);

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const user = await authUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const rl = await checkRateLimit(user.id, 'transcribe');
    if (!rl.ok) return res.status(429).json({ error: 'Terlalu banyak permintaan. Cuba lagi sebentar.' });

    const { fields, audioBuffer, audioMime } = await parseMultipart(req);
    if (!audioBuffer || audioBuffer.length === 0) {
      return res.status(400).json({ error: 'No audio data received' });
    }

    // ── DIARIZE MODE (AssemblyAI batch) ──────────────────────────────────────
    if (fields.mode === 'diarize') {
      if (!process.env.ASSEMBLYAI_API_KEY) {
        return res.status(503).json({ error: 'AssemblyAI not configured' });
      }

      // 1. Upload audio to AssemblyAI
      const uploadRes = await fetch('https://api.assemblyai.com/v2/upload', {
        method: 'POST',
        headers: {
          Authorization: process.env.ASSEMBLYAI_API_KEY,
          'Content-Type': 'application/octet-stream',
        },
        body: audioBuffer,
      });
      if (!uploadRes.ok) throw new Error('AssemblyAI upload failed');
      const { upload_url } = await uploadRes.json();

      // 2. Start transcription job with speaker diarization
      const transcriptRes = await fetch('https://api.assemblyai.com/v2/transcript', {
        method: 'POST',
        headers: {
          Authorization: process.env.ASSEMBLYAI_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audio_url: upload_url,
          speech_models: ['universal-3-pro', 'universal-2'],
          speaker_labels: true,
          speakers_expected: 2,
          language_detection: true,
        }),
      });
      if (!transcriptRes.ok) throw new Error('AssemblyAI transcription job failed');
      const { id } = await transcriptRes.json();

      return res.status(200).json({ job_id: id, status: 'processing' });
    }

    // ── REAL-TIME CHUNK MODE (Whisper) ────────────────────────────────────────
    if (audioBuffer.length > 25 * 1024 * 1024) {
      return res.status(413).json({ error: 'Audio chunk too large' });
    }

    // Language routing: 'auto' = no language param (Whisper auto-detect, best for BM+EN mix)
    // 'ms' / 'ms-MY' → language=ms, 'en' variants → language=en
    const rawLang = (fields.language || '').toLowerCase();
    const whisperLang = rawLang === 'auto' || rawLang === '' ? null
      : rawLang.startsWith('ms') ? 'ms'
      : rawLang.startsWith('en') ? 'en'
      : rawLang;

    // Prompt guides Whisper on Malaysian context + code-switching
    const prompts = {
      ms: 'Soal siasat atau mesyuarat dalam Bahasa Malaysia. Nama, tempat, dan istilah rasmi Malaysia.',
      en: 'Professional interview or meeting in English. Malaysian context, proper nouns.',
      null: 'Soal siasat dalam Bahasa Malaysia dan English. Interview with code-switching BM+EN. Malaysian names and institutions.',
    };
    const whisperPrompt = prompts[whisperLang] ?? prompts[null];

    const form = new FormData();
    form.append('file', new Blob([audioBuffer], { type: audioMime }), 'audio.webm');
    form.append('model', 'whisper-1');
    form.append('prompt', whisperPrompt);
    if (whisperLang) form.append('language', whisperLang);

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
