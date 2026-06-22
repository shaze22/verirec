import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import crypto from 'crypto';
import { checkRateLimit } from './_rateLimit.js';
import { sendEmail, reportReadyEmail } from './_mailer.js';
import { scoreAssessment, interpretAssessment } from './_scoring.js';

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MAX_BODY_BYTES = 3 * 1024 * 1024;

async function callClaudeWithRetry(params, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await anthropic.messages.create(params);
    } catch (err) {
      if (err.status === 529 && i < retries - 1) {
        await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
        continue;
      }
      throw err;
    }
  }
}

function professionPromptExtra(profession) {
  switch (profession) {
    case 'doctor':
      return `
Tambah medan "soapNote" dalam JSON:
{
  "soapNote": {
    "subjective": "aduan pesakit dalam kata-katanya sendiri",
    "objective": "penemuan klinikal yang boleh diperhatikan/diukur",
    "assessment": "penilaian dan diagnosis klinikal",
    "plan": "rancangan rawatan dan susulan"
  }
}`;

    case 'iso':
      return `
Tambah medan "ncrReport" dalam JSON:
{
  "ncrReport": {
    "nonconformance": "penerangan ketidakpatuhan yang ditemui",
    "isoClause": "klausa ISO yang berkaitan (cth. Klausa 8.4.1)",
    "rootCause": "punca akar yang dikenalpasti",
    "correctiveAction": "tindakan pembetulan yang dicadangkan",
    "targetDate": "tarikh sasaran penyelesaian"
  }
}`;

    case 'hr':
      return `
Tambah medan "dcpReport" dalam JSON (ID = Inkuiri Domestik berdasarkan EA 1955):
{
  "dcpReport": {
    "allegation": "tuduhan atau aduan yang disiasat dalam inkuiri domestik",
    "findings": "penemuan siasatan berdasarkan transkrip",
    "recommendation": "cadangan tindakan",
    "proposedPenalty": "hukuman yang dicadangkan berdasarkan EA 1955 / IRA 1967 jika berkenaan"
  }
}`;

    case 'police':
    case 'sprm':
      return `
Tambah medan "statementSummary" dalam JSON:
{
  "statementSummary": {
    "keyFacts": ["fakta utama 1", "fakta utama 2"],
    "inconsistencies": ["ketidakkonsistenan yang dikenal pasti jika ada"],
    "evidenceNotes": "nota berkaitan bukti atau dokumen yang disebutkan"
  }
}`;

    case 'counselor':
      return `
Ini adalah sesi kaunseling. Jana laporan mengikut format CASE SESSION NOTE profesional kaunselor Malaysia (SOP berdasarkan Akta Kaunselor 1998).

Tambah medan berikut dalam JSON:

"caseSessionNote": {
  "presentedIssue": "Isu yang dibawa oleh klien — dalam kata-kata klien sendiri",
  "identifiedIssue": "Isu sebenar yang dikenal pasti oleh kaunselor berdasarkan sesi",
  "mutualGoal": "Matlamat bersama yang dipersetujui antara kaunselor dan klien",
  "activitiesInterventions": "Teknik, pendekatan, dan intervensi yang digunakan dalam sesi (cth. CBT, person-centred, refleksi, soal selidik)",
  "progressGoalAchievement": "Penilaian pencapaian matlamat — adakah klien menunjukkan perubahan atau kemajuan?",
  "followUpPlan": "Rancangan sesi susulan jika matlamat belum tercapai — bila, apa yang perlu dilakukan",
  "terminationNotes": "Nota penamatan sesi — adakah sesi ditamatkan secara formal atau perlu diteruskan",
  "assessmentFindings": "Analisis keputusan assessment jika ada (MBTI/RIASEC) — hubungkan dengan isu yang dibincangkan"
},
"problemTypes": ["senarai jenis masalah yang dikenal pasti dari senarai berikut sahaja: Emosional, Perhubungan Sosial, Pembangunan Kerjaya, Keluarga/Rumah, Akademik, Kewangan, Agama, Seksual, Undang-undang, Kesihatan, Tabiat/Sikap, Krisis"],
"crisisIndicators": {
  "detected": true atau false,
  "level": "none|watch|critical",
  "riskType": "none|mental_health|self_harm|suicidal",
  "notes": "penjelasan ringkas jika ada risiko",
  "resources": ["Talian Kasih 15999", "MIASA 03-2780 6803", "Befrienders KL 03-7627 2929"]
}

Tetapkan crisisIndicators.detected: true jika ada tanda-tanda risiko diri, keganasan, atau krisis psikologi.
Untuk riskType: gunakan "suicidal" jika ada tanda bunuh diri, "self_harm" jika mencederakan diri, "mental_health" jika masalah mental serius, "none" jika tiada.`;

    default:
      return '';
  }
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET — verify document integrity
  if (req.method === 'GET') {
    const { verify, session_id } = req.query;
    if (verify !== 'true' || !session_id) return res.status(400).json({ error: 'Missing params' });
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const { data: session, error } = await supabaseAdmin
        .from('sessions')
        .select('id, user_id, report, hash, transcript')
        .eq('id', session_id)
        .eq('user_id', user.id)
        .single();
      if (error || !session) return res.status(403).json({ error: 'Forbidden' });
      if (!session.hash || !session.report) return res.status(200).json({ match: false, reason: 'no_hash' });
      const hashPayload = JSON.stringify({ report: session.report, transcript: session.transcript, session_id });
      const computed = crypto.createHash('sha256').update(hashPayload).digest('hex');
      return res.status(200).json({ match: computed === session.hash });
    } catch (err) {
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Public — no auth required; compute scores server-side to prevent client-side tampering
  if (req.url?.includes('mode=score-assessment')) {
    try {
      let body;
      try { body = await readBody(req, 10240); } catch { return res.status(400).json({ error: 'Invalid request body' }); }
      const { test_id, answers } = body || {};
      if (!test_id || !Array.isArray(answers)) return res.status(400).json({ error: 'Missing test_id or answers' });
      const scores = scoreAssessment(test_id, answers);
      const interpretation = interpretAssessment(test_id, scores);
      return res.status(200).json({ scores, interpretation });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }

  // Seal a signed informed-consent record (SHA-256 tamper seal, computed server-side)
  if (req.url?.includes('mode=seal-consent')) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) return res.status(401).json({ error: 'Unauthorized' });
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
      if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

      let body;
      try { body = await readBody(req, MAX_BODY_BYTES); } catch (err) { return res.status(413).json({ error: err.message }); }
      const {
        subject_id, language, full_name, ic_number,
        is_guardian, guardian_name, guardian_relationship,
        clauses, signature, signed_at, version,
      } = body || {};
      if (!subject_id || !full_name || !signature || !signed_at) {
        return res.status(400).json({ error: 'Missing required consent fields' });
      }

      // Authorize: the counselor who owns the client, OR the client themselves (portal self-sign)
      const { data: subject, error: subjErr } = await supabaseAdmin
        .from('subjects').select('id, user_id, portal_user_id').eq('id', subject_id).single();
      if (subjErr || !subject) return res.status(403).json({ error: 'Forbidden' });
      const isCounselor = subject.user_id === user.id;
      const isClient = subject.portal_user_id === user.id;
      if (!isCounselor && !isClient) return res.status(403).json({ error: 'Forbidden' });
      const signed_via = isCounselor ? 'in_person' : 'portal';

      const canonical = JSON.stringify({
        subject_id, version: version || '0', language: language || 'ms', full_name,
        ic_number: ic_number || null, is_guardian: !!is_guardian,
        guardian_name: guardian_name || null, guardian_relationship: guardian_relationship || null,
        clauses: clauses || {}, signed_at,
        signature_sha: crypto.createHash('sha256').update(signature).digest('hex'),
      });
      const hash = crypto.createHash('sha256').update(canonical).digest('hex');

      // A new full consent supersedes any prior active consent for this client
      await supabaseAdmin.from('client_consents')
        .update({ status: 'superseded' })
        .eq('subject_id', subject_id).eq('status', 'active');

      const { data: consent, error: insErr } = await supabaseAdmin
        .from('client_consents')
        .insert({
          subject_id, user_id: subject.user_id, version: version || '0',
          language: language || 'ms', full_name,
          ic_number: ic_number || null, is_guardian: !!is_guardian,
          guardian_name: guardian_name || null, guardian_relationship: guardian_relationship || null,
          clauses: clauses || {}, signature_data: signature,
          signed_at, hash, user_agent: req.headers['user-agent'] || '', status: 'active',
          signed_via,
        })
        .select('id, hash, signed_at, status, full_name, language, signed_via')
        .single();
      if (insErr) return res.status(500).json({ error: insErr.message });
      return res.status(200).json({ consent });
    } catch (err) {
      return res.status(500).json({ error: err.message || 'Internal server error' });
    }
  }

  // Re-affirm an existing active consent at the start of a follow-up session
  if (req.url?.includes('mode=reaffirm-consent')) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) return res.status(401).json({ error: 'Unauthorized' });
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
      if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

      let body;
      try { body = await readBody(req, 10240); } catch (err) { return res.status(413).json({ error: err.message }); }
      const { consent_id, subject_id, session_id } = body || {};
      if (!consent_id || !subject_id) return res.status(400).json({ error: 'Missing fields' });

      const { data: consent, error: cErr } = await supabaseAdmin
        .from('client_consents').select('id, user_id, hash, status').eq('id', consent_id).single();
      if (cErr || !consent || consent.user_id !== user.id) return res.status(403).json({ error: 'Forbidden' });
      if (consent.status !== 'active') return res.status(400).json({ error: 'Consent is not active' });

      const affirmed_at = new Date().toISOString();
      const hash = crypto.createHash('sha256')
        .update(JSON.stringify({ consent_id, subject_id, session_id: session_id || null, affirmed_at, base: consent.hash }))
        .digest('hex');
      const { data: row, error: rErr } = await supabaseAdmin
        .from('consent_reaffirmations')
        .insert({ consent_id, subject_id, user_id: user.id, session_id: session_id || null, affirmed_at, hash })
        .select('id, affirmed_at').single();
      if (rErr) return res.status(500).json({ error: rErr.message });
      return res.status(200).json({ reaffirmation: row });
    } catch (err) {
      return res.status(500).json({ error: err.message || 'Internal server error' });
    }
  }

  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

    const rl = await checkRateLimit(user.id, 'report');
    if (!rl.ok) {
      return res.status(429).json({ error: 'Terlalu banyak permintaan. Cuba lagi sebentar.' });
    }

    let body;
    try {
      body = await readBody(req, MAX_BODY_BYTES);
    } catch (err) {
      return res.status(413).json({ error: err.message });
    }

    const { session_id, transcript, flags, session_info, subject_info } = body;
    if (!session_id || !transcript) return res.status(400).json({ error: 'Missing required fields' });

    const { data: session, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('id, user_id, report, hash')
      .eq('id', session_id)
      .eq('user_id', user.id)
      .single();


    if (sessionError || !session) return res.status(403).json({ error: 'Forbidden' });

    if (session.report) {
      return res.status(200).json({ report: session.report, hash: session.hash });
    }

    // Fetch assessment results for this session
    const { data: assessments } = await supabaseAdmin
      .from('session_assessments')
      .select('result, assessment_id, assessment_sets(name, type)')
      .eq('session_id', session_id);

    const assessmentText = assessments?.length
      ? assessments.map(a => {
          const name = a.assessment_sets?.name || 'Assessment';
          const type = a.assessment_sets?.type;
          if (type === 'mbti') return `${name}: Jenis ${a.result?.type || '-'}`;
          if (type === 'riasec') return `${name}: Kod Holland ${a.result?.code || '-'}`;
          return `${name}: ${JSON.stringify(a.result)}`;
        }).join('\n')
      : null;

    const profession = session_info?.profession || 'umum';
    const transcriptText = transcript
      .filter(e => e.type === 'TRANSCRIPT')
      .slice(0, 300)
      .map(e => `[${e.speaker || 'Tidak diketahui'}]: ${e.text}`)
      .join('\n');

    const extraPrompt = professionPromptExtra(profession);

    const message = await callClaudeWithRetry({
      model: 'claude-opus-4-7',
      max_tokens: 3000,
      messages: [{
        role: 'user',
        content: `Anda adalah penganalisis sesi profesional untuk ${profession} Malaysia.

Maklumat sesi:
- Profesion: ${profession}
- Pengendali sesi: ${session_info?.interviewer || 'Tidak diketahui'}
- Subjek: ${session_info?.subject_name || 'Tidak diketahui'} (${session_info?.subject_role || ''})
- No. Kes: ${session_info?.case_number || 'Tiada'}
- Pegawai Saksi: ${session_info?.witness_officer || 'Tiada'}
- Konteks: ${session_info?.context_notes || 'Tiada'}
- Tempoh: ${Math.round((session_info?.duration || 0) / 60)} minit
${subject_info ? `- Maklumat klien: ${subject_info.name}, ${subject_info.gender || ''}, ${subject_info.marital_status || ''}, ${subject_info.occupation || ''}
- Isu yang dibawa: ${subject_info.presenting_issue || 'Tidak dinyatakan'}
- Jenis sesi: ${subject_info.session_type === 'referred' ? 'Rujukan' : 'Sukarela'}
- Sejarah psikiatri: ${subject_info.psychiatric_history ? 'Ya' : 'Tidak'}, Ubat psikiatri: ${subject_info.psychiatric_medication ? 'Ya' : 'Tidak'}` : ''}

Transkrip:
${transcriptText}

Bendera yang ditanda:
${flags?.map(f => `- ${f.text}`).join('\n') || '(tiada)'}
${assessmentText ? `\nKeputusan Assessment:\n${assessmentText}` : ''}

Balas dalam JSON sahaja dengan medan berikut:
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
  "followUpReason": "sebab susulan diperlukan jika ada",
  "followUpItems": ["tindakan susulan spesifik 1", "tindakan susulan spesifik 2"]
}
${extraPrompt}

Semua teks dalam Bahasa Malaysia. Jika sesuatu medan tidak berkaitan atau tiada maklumat, kembalikan array kosong atau null.`
      }]
    });

    const text = message.content[0].text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(500).json({ error: 'Invalid AI response' });

    let report;
    try {
      report = JSON.parse(jsonMatch[0]);
    } catch {
      return res.status(500).json({ error: 'Malformed AI response — could not parse JSON' });
    }

    const hashPayload = JSON.stringify({ report, transcript, session_id });
    const hash = crypto.createHash('sha256').update(hashPayload).digest('hex');

    const { error: saveError } = await supabaseAdmin
      .from('sessions')
      .update({ report, hash, updated_at: new Date().toISOString() })
      .eq('id', session_id);
    if (saveError) throw new Error('Failed to save report to database: ' + saveError.message);

    // Fire-and-forget: notify user that report is ready
    const { subject, html } = reportReadyEmail(session_info?.title, session_id);
    sendEmail({ to: user.email, subject, html }).catch((emailErr) => {
      console.error('report email failed (non-fatal):', emailErr?.message);
    });

    return res.status(200).json({ report, hash });
  } catch (err) {
    console.error('report error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

function readBody(req, maxBytes) {
  return new Promise((resolve, reject) => {
    let data = '';
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > maxBytes) {
        req.destroy();
        reject(new Error('Request body too large'));
        return;
      }
      data += chunk;
    });
    req.on('end', () => {
      try { resolve(JSON.parse(data)); } catch { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}
