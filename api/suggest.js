import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { checkRateLimit } from './_rateLimit.js';

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function callGeminiFallback(prompt) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

const planOrder = { free: 0, counselor: 1, starter: 1, pro: 2, biz: 3 };

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

// Unified JSON schema for all profession auto-analysis:
// { penemuan[], tahapRisiko, justifikasiRisiko, sualanSusulan[], pemerhatian, tindakan[], redFlag, redFlagNote }

function buildAutoAnalysisPrompt(profession, phase, recentTexts, fullTexts) {
  const recent = recentTexts.map(t => `- "${t}"`).join('\n') || '(tiada lagi)';
  const full = fullTexts.map(t => `- "${t}"`).join('\n') || '(tiada lagi)';

  const prompts = {
    counselor: `Anda adalah pembantu klinikal untuk kaunselor profesional bertauliah di Malaysia.
PERINGATAN: Output anda adalah panduan sokongan sahaja, BUKAN diagnosis rasmi.

Fasa: ${phase}
Petikan terkini: ${recent}
Konteks penuh: ${full}

Analisa perbualan kaunseling dan balas JSON:
{
  "penemuan": ["simptom atau kebimbangan yang mungkin hadir berdasarkan perbualan, maksimum 4"],
  "tahapRisiko": "Rendah | Sederhana | Tinggi",
  "justifikasiRisiko": "satu ayat ringkas kenapa tahap risiko ini",
  "sualanSusulan": ["soalan CBT/terapi yang sesuai 1", "soalan 2", "soalan 3"],
  "pemerhatian": "pemerhatian klinikal ringkas tentang keadaan klien",
  "tindakan": ["teknik kaunseling disyorkan (CBT, DBT, dll), maksimum 3"],
  "redFlag": false,
  "redFlagNote": ""
}
Panduan: Rendah=tiada tanda bahaya, Sederhana=perlu pantau/rujuk, Tinggi=krisis/ideasi bahaya diri.`,

    police: `Anda adalah pembantu penyiasatan untuk pegawai polis Malaysia menggunakan model PEACE.
Fasa: ${phase}
Petikan terkini: ${recent}
Konteks penuh: ${full}

Analisa penyataan dan balas JSON:
{
  "penemuan": ["ketidakkonsistenan atau jurang maklumat yang dikesan, maksimum 4"],
  "tahapRisiko": "Rendah | Sederhana | Tinggi",
  "justifikasiRisiko": "penilaian kredibiliti dan kerjasama subjek secara ringkas",
  "sualanSusulan": ["soalan susulan berdasarkan PEACE model 1", "soalan 2", "soalan 3"],
  "pemerhatian": "penilaian ringkas terhadap penyataan subjek setakat ini",
  "tindakan": ["langkah penyiasatan yang disyorkan, maksimum 3"],
  "redFlag": false,
  "redFlagNote": ""
}
Panduan: Rendah=kerjasama baik, Sederhana=ada jurang perlu disiasat, Tinggi=tanda penipuan atau ancaman.`,

    sprm: `Anda adalah pembantu analitik untuk pegawai penyiasat SPRM Malaysia.
Fasa: ${phase}
Petikan terkini: ${recent}
Konteks penuh: ${full}

Analisa penyataan berkaitan integriti dan balas JSON:
{
  "penemuan": ["tanda-tanda atau pola yang mencurigakan dalam penyataan, maksimum 4"],
  "tahapRisiko": "Rendah | Sederhana | Tinggi",
  "justifikasiRisiko": "penilaian ringkas potensi penyelewengan atau rasuah",
  "sualanSusulan": ["soalan susulan berdasarkan undang-undang SPRM/MACC 2009 1", "soalan 2", "soalan 3"],
  "pemerhatian": "rumusan ringkas tentang kredibiliti penyataan dan kawasan yang perlu diteliti",
  "tindakan": ["tindakan penyiasatan yang disyorkan (dokumen diperlukan, saksi, dll), maksimum 3"],
  "redFlag": false,
  "redFlagNote": ""
}
Panduan: Rendah=tiada tanda penyelewengan, Sederhana=ada perkara perlu disiasat lanjut, Tinggi=tanda jelas rasuah/salah laku.`,

    doctor: `Anda adalah pembantu klinikal untuk pengamal perubatan di Malaysia menggunakan format SOAP.
PERINGATAN: Output adalah panduan sokongan sahaja, BUKAN diagnosis rasmi.

Fasa: ${phase}
Petikan terkini: ${recent}
Konteks penuh: ${full}

Analisa perbualan klinikal dan balas JSON:
{
  "penemuan": ["simptom yang dinyatakan atau tersirat dalam perbualan, maksimum 5"],
  "tahapRisiko": "Rendah | Sederhana | Tinggi",
  "justifikasiRisiko": "penilaian keterukan kes berdasarkan simptom yang dilaporkan",
  "sualanSusulan": ["soalan klinikal susulan berdasarkan Calgary-Cambridge Guide 1", "soalan 2", "soalan 3"],
  "pemerhatian": "rumusan klinikal ringkas termasuk sistem yang belum dikaji",
  "tindakan": ["kemungkinan diagnosis pembezaan (differential), maksimum 3"],
  "redFlag": false,
  "redFlagNote": ""
}
Panduan: Rendah=simptom ringan, Sederhana=perlu penilaian lanjut atau rujukan, Tinggi=tanda bahaya klinikal (red flag symptoms).`,

    iso: `Anda adalah pembantu teknikal untuk juruaudit ISO berpengalaman di Malaysia.
Fasa: ${phase}
Petikan terkini: ${recent}
Konteks penuh: ${full}

Analisa sesi audit dan balas JSON:
{
  "penemuan": ["potensi ketidakpatuhan (nonconformity) atau pemerhatian audit yang dikesan, maksimum 4"],
  "tahapRisiko": "Rendah | Sederhana | Tinggi",
  "justifikasiRisiko": "penilaian tahap pematuhan sistem pengurusan organisasi secara ringkas",
  "sualanSusulan": ["soalan audit susulan berdasarkan ISO 9001:2015 / ISO 19011 1", "soalan 2", "soalan 3"],
  "pemerhatian": "rumusan penemuan audit setakat ini termasuk klausa yang berkaitan",
  "tindakan": ["klausa ISO atau tindakan audit yang disyorkan, maksimum 3"],
  "redFlag": false,
  "redFlagNote": ""
}
Panduan: Rendah=pematuhan baik, Sederhana=pemerhatian minor perlu tindakan pembetulan, Tinggi=ketidakpatuhan major atau potensi penipuan rekod.`,

    hr: `Anda adalah pembantu prosedur untuk pegawai penyiasat HR mengendalikan inkuiri domestik di Malaysia (Akta Kerja 1955).
Fasa: ${phase}
Petikan terkini: ${recent}
Konteks penuh: ${full}

Analisa penyataan inkuiri domestik dan balas JSON:
{
  "penemuan": ["fakta atau dakwaan yang perlu disahkan berdasarkan penyataan, maksimum 4"],
  "tahapRisiko": "Rendah | Sederhana | Tinggi",
  "justifikasiRisiko": "penilaian keterukan kes tatatertib berdasarkan maklumat yang ada",
  "sualanSusulan": ["soalan inkuiri susulan berdasarkan prosedur tatatertib 1", "soalan 2", "soalan 3"],
  "pemerhatian": "rumusan ringkas tentang konsistensi penyataan dan kawasan yang perlu diteliti",
  "tindakan": ["tindakan penyiasatan HR yang disyorkan (saksi, dokumen, dll), maksimum 3"],
  "redFlag": false,
  "redFlagNote": ""
}
Panduan: Rendah=isu minor, Sederhana=pelanggaran dasar yang perlu siasatan lanjut, Tinggi=salah laku serius (misconduct) yang mungkin waranti penamatan atau tindakan undang-undang.`,

    jkm: `Anda adalah pembantu penilaian untuk pegawai Jabatan Kebajikan Masyarakat (JKM) Malaysia.
PERINGATAN: Output adalah panduan penilaian sokongan sahaja. Keputusan muktamad adalah tanggungjawab pegawai kebajikan bertauliah.

Fasa: ${phase}
Petikan terkini: ${recent}
Konteks penuh: ${full}

Analisa temubual kebajikan dan balas JSON:
{
  "penemuan": ["petanda risiko, tanda penderaan/pengabaian, atau kebimbangan kebajikan yang dikesan, maksimum 4"],
  "tahapRisiko": "Rendah | Sederhana | Tinggi",
  "justifikasiRisiko": "penilaian ringkas tahap keselamatan dan risiko terhadap individu berisiko",
  "sualanSusulan": ["soalan trauma-informed susulan untuk mendalami penilaian risiko 1", "soalan 2", "soalan 3"],
  "pemerhatian": "rumusan penilaian kebajikan termasuk faktor pelindung dan faktor risiko yang dikenal pasti",
  "tindakan": ["tindakan kebajikan, penempatan, atau rujukan agensi yang disyorkan, maksimum 3"],
  "redFlag": false,
  "redFlagNote": ""
}
Panduan: Rendah=tiada petanda bahaya segera, Sederhana=ada kebimbangan perlu pemantauan dan intervensi, Tinggi=risiko bahaya segera — laporan mandatori dan tindakan perlindungan diperlukan.`,

    peguam: `Anda adalah pembantu analisa untuk peguam dalam perundingan klien atau temubual saksi di Malaysia berdasarkan Akta Profesion Undang-Undang 1976 dan prinsip Legal Professional Privilege.
Fasa: ${phase}
Petikan terkini: ${recent}
Konteks penuh: ${full}

Analisa perbualan guaman dan balas JSON:
{
  "penemuan": ["jurang fakta, risiko undang-undang, atau perkara yang perlu disahkan, maksimum 4"],
  "tahapRisiko": "Rendah | Sederhana | Tinggi",
  "justifikasiRisiko": "penilaian kekuatan kes dan risiko perundangan secara ringkas",
  "sualanSusulan": ["soalan susulan kepada klien atau saksi bagi mengisi jurang fakta 1", "soalan 2", "soalan 3"],
  "pemerhatian": "analisa ringkas kekuatan, kelemahan, dan peluang kes setakat ini",
  "tindakan": ["tindakan undang-undang, penyiasatan, atau strategi guaman yang disyorkan, maksimum 3"],
  "redFlag": false,
  "redFlagNote": ""
}
Panduan: Rendah=fakta jelas dan kes kukuh, Sederhana=ada jurang atau risiko yang perlu ditangani, Tinggi=risiko undang-undang serius atau potensi konflik kepentingan.`,

    court: `Anda adalah pembantu perundangan untuk peguam atau hakim dalam prosiding mahkamah Malaysia berdasarkan Akta Keterangan 1950 dan Kanun Prosedur Jenayah.
Fasa: ${phase}
Petikan terkini: ${recent}
Konteks penuh: ${full}

Analisa keterangan dan prosiding mahkamah, balas JSON:
{
  "penemuan": ["kelemahan, percanggahan, atau jurang dalam keterangan saksi yang dikesan, maksimum 4"],
  "tahapRisiko": "Rendah | Sederhana | Tinggi",
  "justifikasiRisiko": "penilaian kredibiliti keterangan dan kekuatan kes secara ringkas",
  "sualanSusulan": ["soalan pemeriksaan balas atau susulan yang berkesan 1", "soalan 2", "soalan 3"],
  "pemerhatian": "analisa ringkas tentang kekuatan atau kelemahan keterangan yang diberi setakat ini",
  "tindakan": ["strategi soal balas, hujahan, atau tindakan perundangan yang disyorkan, maksimum 3"],
  "redFlag": false,
  "redFlagNote": ""
}
Panduan: Rendah=keterangan konsisten dan kukuh, Sederhana=ada jurang atau percanggahan yang boleh dipersoal, Tinggi=keterangan tidak boleh dipercayai atau tanda penghinaan mahkamah/keterangan palsu.`,
  };

  return (prompts[profession] || prompts.police) + '\n\nSemua teks dalam Bahasa Malaysia. Analisa hanya berdasarkan apa yang DINYATAKAN dalam perbualan.';
}

function buildGenericPrompt(profession, phase, question, recentTranscript) {
  return `Anda adalah pembantu temuduga profesional untuk ${profession} Malaysia.
Fasa semasa: ${phase}
Soalan terkini: "${question}"
Petikan transkrip terkini:
${recentTranscript.join('\n') || '(tiada lagi)'}

Balas dalam JSON sahaja (tiada teks lain):
{
  "followUp": ["soalan susulan 1", "soalan susulan 2", "soalan susulan 3"],
  "observation": "pemerhatian ringkas",
  "redFlag": false,
  "redFlagNote": ""
}
Semua teks dalam Bahasa Malaysia.`;
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

    const rl = await checkRateLimit(user.id, 'suggest');
    if (!rl.ok) {
      return res.status(429).json({ error: 'Terlalu banyak permintaan. Cuba lagi sebentar.' });
    }

    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('plan')
      .eq('user_id', user.id)
      .single();

    if ((planOrder[sub?.plan] || 0) < planOrder['starter']) {
      return res.status(402).json({ error: 'plan_required', required: 'starter' });
    }

    const body = await readBody(req);
    const { mode, profession, phase, question, recent_transcript = [], transcript = [], case_summaries = [], case_title = '' } = body;

    const isAutoMode = mode === 'auto_analysis';
    const isCaseSummary = mode === 'case_summary';

    if (isCaseSummary) {
      if (!case_summaries.length) return res.status(400).json({ error: 'No session summaries provided' });
      const sessionLines = case_summaries.map((s, i) =>
        `Sesi ${i + 1}: [${s.date}] ${s.subject} — Risiko: ${s.riskLevel || 'Tidak dianalisis'}\nRingkasan: ${s.summary || 'Tiada ringkasan'}\n${s.findings ? 'Penemuan: ' + s.findings.join('; ') : ''}`
      ).join('\n\n');
      const casePrompt = `Anda adalah penganalisis kes profesional untuk platform VeriRec Malaysia.

Kes: ${case_title}
Bilangan sesi: ${case_summaries.length}

Ringkasan setiap sesi:
${sessionLines}

Jana ringkasan keseluruhan kes dalam Bahasa Malaysia yang mencakupi:
1. Tema utama dan corak yang dikesan merentas sesi
2. Perkembangan kes dari masa ke masa
3. Risiko kumulatif dan tahap risiko keseluruhan
4. Cadangan tindakan susulan konkrit

Format respons dalam 4 perenggan yang teratur dan jelas. Jangan guna bullet points. Tulis dalam nada profesional yang sesuai untuk laporan rasmi.`;

      let summaryText;
      let provider = 'claude';
      try {
        const message = await anthropic.messages.create({
          model: 'claude-opus-4-7',
          max_tokens: 800,
          messages: [{ role: 'user', content: casePrompt }],
        });
        summaryText = message.content[0].text.trim();
      } catch (claudeErr) {
        const isRetryable = claudeErr?.status === 529 || claudeErr?.status >= 500;
        if (!isRetryable) throw claudeErr;
        summaryText = await callGeminiFallback(casePrompt);
        provider = 'gemini';
      }
      return res.status(200).json({ summary: summaryText, mode: 'case_summary', provider });
    }

    if (!isAutoMode && (!profession || !question)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (isAutoMode && recent_transcript.length === 0 && transcript.length === 0) {
      return res.status(400).json({ error: 'No transcript to analyze' });
    }

    const safeRecent = recent_transcript.slice(-5).map(t => String(t).slice(0, 400));
    const safeFull = transcript.slice(-20).map(t => String(t).slice(0, 400));
    const safeQuestion = String(question || '').slice(0, 500);

    const prompt = isAutoMode
      ? buildAutoAnalysisPrompt(profession, phase, safeRecent, safeFull)
      : buildGenericPrompt(profession, phase, safeQuestion, safeRecent);

    let text;
    let provider = 'claude';
    try {
      const message = await anthropic.messages.create({
        model: 'claude-opus-4-7',
        max_tokens: 700,
        messages: [{ role: 'user', content: prompt }],
      });
      text = message.content[0].text.trim();
    } catch (claudeErr) {
      // Fallback to Gemini when Claude is unavailable (529, 500, timeout)
      const isRetryable = claudeErr?.status === 529 || claudeErr?.status >= 500;
      if (!isRetryable) throw claudeErr;
      console.warn('Claude unavailable, falling back to Gemini:', claudeErr?.status);
      text = await callGeminiFallback(prompt);
      provider = 'gemini';
    }

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(502).json({ error: 'Invalid AI response' });

    const data = JSON.parse(jsonMatch[0]);
    return res.status(200).json({ ...data, mode: isAutoMode ? 'auto_analysis' : 'generic', provider });
  } catch (err) {
    console.error('suggest error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
