import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import Busboy from 'busboy';
import { checkRateLimit } from './_rateLimit.js';

export const config = { api: { bodyParser: false } };

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const MIME_MAP = {
  mp3: 'audio/mpeg', m4a: 'audio/mp4', mp4: 'audio/mp4', wav: 'audio/wav',
  webm: 'audio/webm', ogg: 'audio/ogg', flac: 'audio/flac', aac: 'audio/aac', mov: 'video/quicktime',
};

const DIARIZE_PROMPT =
  'Transcribe this recorded session audio. Return ONLY a JSON array of speaker turns:\n' +
  '[{"speaker":"A","text":"..."},{"speaker":"B","text":"..."}]\n' +
  'A = first speaker, B = second speaker. ' +
  'Transcribe in the original language (Bahasa Malaysia, English, or mixed BM/EN). ' +
  'Merge consecutive turns by the same speaker. No markdown, no explanation — JSON array only.';

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

async function geminiTranscribeAudio(audioBuffer, mimeType) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  let parts;
  if (audioBuffer.length <= 15 * 1024 * 1024) {
    parts = [DIARIZE_PROMPT, { inlineData: { data: audioBuffer.toString('base64'), mimeType } }];
  } else {
    const ext = Object.entries(MIME_MAP).find(([, v]) => v === mimeType)?.[0] || 'mp3';
    const uploadRes = await fetch(
      `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'X-Goog-Upload-Protocol': 'raw',
          'X-Goog-Upload-File-Name': `session.${ext}`,
          'Content-Type': mimeType,
        },
        body: audioBuffer,
      }
    );
    if (!uploadRes.ok) throw new Error('Gemini file upload failed');
    const { file } = await uploadRes.json();

    let state = file.state;
    for (let i = 0; state !== 'ACTIVE' && i < 20; i++) {
      await new Promise(r => setTimeout(r, 2000));
      const checkRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/${file.name}?key=${process.env.GEMINI_API_KEY}`
      );
      state = (await checkRes.json()).state;
    }

    parts = [DIARIZE_PROMPT, { fileData: { fileUri: file.uri, mimeType } }];
    fetch(`https://generativelanguage.googleapis.com/v1beta/${file.name}?key=${process.env.GEMINI_API_KEY}`, {
      method: 'DELETE',
    }).catch(() => {});
  }

  const result = await model.generateContent(parts);
  const raw = result.response.text().trim();

  try {
    const jsonStr = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    const parsed = JSON.parse(jsonStr);
    if (Array.isArray(parsed)) {
      return parsed.map(u => ({ speaker: String(u.speaker || 'A'), text: String(u.text || ''), start: 0, end: 0 }));
    }
  } catch { /* fall through */ }
  return [{ speaker: 'A', text: raw, start: 0, end: 0 }];
}

function applyNames(utterances, interviewer, subject_name) {
  const speakers = [...new Set(utterances.map(u => u.speaker))].sort();
  const nameMap = {};
  speakers.forEach((sp, i) => {
    nameMap[sp] = i === 0 ? (interviewer || null) : (i === 1 ? (subject_name || null) : null);
  });
  return utterances.map(u => ({ ...u, identified_name: nameMap[u.speaker] ?? null }));
}

async function handleDiarize(res, audioBuffer, audioMime, fields) {
  if (!process.env.GEMINI_API_KEY) return res.status(503).json({ error: 'Gemini not configured' });
  const utterances = await geminiTranscribeAudio(audioBuffer, audioMime);
  const { interviewer, subject_name } = fields;
  const result = (interviewer || subject_name) ? applyNames(utterances, interviewer, subject_name) : utterances;
  return res.status(200).json({ status: 'completed', utterances: result });
}

async function handleImport(res, body) {
  const { storage_path, interviewer, subject_name } = body;
  if (!storage_path) return res.status(400).json({ error: 'Missing storage_path' });
  if (!process.env.GEMINI_API_KEY) return res.status(503).json({ error: 'Gemini not configured' });

  const { data, error } = await supabaseAdmin.storage.from('recordings').createSignedUrl(storage_path, 7200);
  if (error || !data?.signedUrl) return res.status(400).json({ error: 'Could not access file' });

  const audioRes = await fetch(data.signedUrl);
  if (!audioRes.ok) throw new Error('Failed to download audio from storage');
  const audioBuffer = Buffer.from(await audioRes.arrayBuffer());

  const ext = (storage_path.split('.').pop() || 'mp3').toLowerCase();
  const mimeType = MIME_MAP[ext] || 'audio/mpeg';

  const utterances = await geminiTranscribeAudio(audioBuffer, mimeType);
  const result = (interviewer || subject_name) ? applyNames(utterances, interviewer, subject_name) : utterances;
  return res.status(200).json({ status: 'completed', utterances: result });
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const contentType = req.headers['content-type'] || '';

  // Multipart: real-time Whisper chunk or Gemini diarize
  if (contentType.includes('multipart/form-data')) {
    const user = await authUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const rl = await checkRateLimit(user.id, 'transcribe');
    if (!rl.ok) return res.status(429).json({ error: 'Too many requests. Please try again shortly.' });

    try {
      const { fields, audioBuffer, audioMime } = await parseMultipart(req);
      if (!audioBuffer || audioBuffer.length === 0) return res.status(400).json({ error: 'No audio data received' });

      if (fields.mode === 'diarize') return await handleDiarize(res, audioBuffer, audioMime, fields);

      // Real-time Whisper chunk
      if (audioBuffer.length > 25 * 1024 * 1024) return res.status(413).json({ error: 'Audio chunk too large' });

      const rawLang = (fields.language || '').toLowerCase();
      const whisperLang = rawLang === 'auto' || rawLang === '' ? null
        : rawLang.startsWith('ms') ? 'ms'
        : rawLang.startsWith('en') ? 'en'
        : rawLang;

      const prompts = {
        ms:   'Soal siasat atau mesyuarat dalam Bahasa Malaysia. Nama, tempat, dan istilah rasmi Malaysia.',
        en:   'Professional interview or meeting in English. Malaysian context, proper nouns.',
        null: 'Soal siasat dalam Bahasa Malaysia dan English. Interview with code-switching BM+EN. Malaysian names and institutions.',
      };

      const form = new FormData();
      form.append('file', new Blob([audioBuffer], { type: audioMime }), 'audio.webm');
      form.append('model', 'whisper-1');
      form.append('prompt', prompts[whisperLang] ?? prompts[null]);
      if (whisperLang) form.append('language', whisperLang);

      const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        body: form,
      });

      if (!whisperRes.ok) {
        console.error('Whisper error:', await whisperRes.text());
        return res.status(502).json({ error: 'Transcription service error' });
      }

      const data = await whisperRes.json();
      return res.status(200).json({ text: data.text?.trim() || '', duration: data.duration || 0 });

    } catch (err) {
      console.error('transcribe error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // JSON: text generation or import transcription
  try {
    const body = await readBody(req);

    if (body.mode === 'import') {
      const user = await authUser(req);
      if (!user) return res.status(401).json({ error: 'Unauthorized' });
      const rl = await checkRateLimit(user.id, 'transcribe');
      if (!rl.ok) return res.status(429).json({ error: 'Too many requests. Please try again shortly.' });
      return await handleImport(res, body);
    }

    // Text generation (no auth required — called internally from suggest.js fallback)
    const { prompt, model = 'gemini-2.5-flash', maxTokens = 1024 } = body;
    if (!prompt) return res.status(400).json({ error: 'prompt is required' });

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const geminiModel = genAI.getGenerativeModel({ model, generationConfig: { maxOutputTokens: maxTokens } });
    const result = await geminiModel.generateContent(prompt);
    return res.status(200).json({ text: result.response.text() });

  } catch (err) {
    console.error('gemini error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
