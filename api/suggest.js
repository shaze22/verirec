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
  const recent = recentTexts.map(t => `- "${t}"`).join('\n') || '(none yet)';
  const full = fullTexts.map(t => `- "${t}"`).join('\n') || '(none yet)';

  const prompts = {
    counselor: `You are a clinical assistant for licensed professional counselors in Malaysia.
REMINDER: Your output is a support guide only, NOT an official diagnosis.

Phase: ${phase}
Recent excerpt: ${recent}
Full context: ${full}

Analyse the counseling conversation and respond in JSON:
{
  "penemuan": ["possible symptoms or concerns present based on the conversation, maximum 4"],
  "tahapRisiko": "Rendah | Sederhana | Tinggi",
  "justifikasiRisiko": "one brief sentence explaining this risk level",
  "sualanSusulan": ["appropriate CBT/therapy question 1", "question 2", "question 3"],
  "pemerhatian": "brief clinical observation about the client's current state",
  "tindakan": ["recommended counseling technique (CBT, DBT, etc.), maximum 3"],
  "redFlag": false,
  "redFlagNote": ""
}
Guide: Rendah=no danger signs, Sederhana=needs monitoring/referral, Tinggi=crisis/self-harm ideation.`,

    police: `You are an investigation assistant for Malaysian police officers using the PEACE model.
Phase: ${phase}
Recent excerpt: ${recent}
Full context: ${full}

Analyse the statement and respond in JSON:
{
  "penemuan": ["inconsistencies or information gaps detected, maximum 4"],
  "tahapRisiko": "Rendah | Sederhana | Tinggi",
  "justifikasiRisiko": "brief assessment of subject credibility and cooperation",
  "sualanSusulan": ["follow-up question based on PEACE model 1", "question 2", "question 3"],
  "pemerhatian": "brief assessment of the subject's statement so far",
  "tindakan": ["recommended investigation step, maximum 3"],
  "redFlag": false,
  "redFlagNote": ""
}
Guide: Rendah=good cooperation, Sederhana=gaps requiring investigation, Tinggi=signs of deception or threat.`,

    sprm: `You are an analytical assistant for SPRM/MACC investigating officers in Malaysia.
Phase: ${phase}
Recent excerpt: ${recent}
Full context: ${full}

Analyse the integrity-related statement and respond in JSON:
{
  "penemuan": ["suspicious signs or patterns detected in the statement, maximum 4"],
  "tahapRisiko": "Rendah | Sederhana | Tinggi",
  "justifikasiRisiko": "brief assessment of potential misconduct or corruption",
  "sualanSusulan": ["follow-up question based on SPRM/MACC Act 2009 1", "question 2", "question 3"],
  "pemerhatian": "brief summary of statement credibility and areas requiring scrutiny",
  "tindakan": ["recommended investigation action (documents needed, witnesses, etc.), maximum 3"],
  "redFlag": false,
  "redFlagNote": ""
}
Guide: Rendah=no misconduct signs, Sederhana=matters requiring further investigation, Tinggi=clear signs of corruption/misconduct.`,

    doctor: `You are a clinical assistant for medical practitioners in Malaysia using the SOAP format.
REMINDER: Output is a support guide only, NOT an official diagnosis.

Phase: ${phase}
Recent excerpt: ${recent}
Full context: ${full}

Analyse the clinical conversation and respond in JSON:
{
  "penemuan": ["symptoms stated or implied in the conversation, maximum 5"],
  "tahapRisiko": "Rendah | Sederhana | Tinggi",
  "justifikasiRisiko": "severity assessment based on reported symptoms",
  "sualanSusulan": ["clinical follow-up question based on Calgary-Cambridge Guide 1", "question 2", "question 3"],
  "pemerhatian": "brief clinical summary including systems not yet assessed",
  "tindakan": ["possible differential diagnoses, maximum 3"],
  "redFlag": false,
  "redFlagNote": ""
}
Guide: Rendah=mild symptoms, Sederhana=needs further assessment or referral, Tinggi=clinical red flag symptoms.`,

    iso: `You are a technical assistant for experienced ISO auditors in Malaysia.
Phase: ${phase}
Recent excerpt: ${recent}
Full context: ${full}

Analyse the audit session and respond in JSON:
{
  "penemuan": ["potential nonconformities or audit observations detected, maximum 4"],
  "tahapRisiko": "Rendah | Sederhana | Tinggi",
  "justifikasiRisiko": "brief assessment of the organisation's management system compliance level",
  "sualanSusulan": ["audit follow-up question based on ISO 9001:2015 / ISO 19011 1", "question 2", "question 3"],
  "pemerhatian": "summary of audit findings so far including relevant clauses",
  "tindakan": ["recommended ISO clause or audit action, maximum 3"],
  "redFlag": false,
  "redFlagNote": ""
}
Guide: Rendah=good compliance, Sederhana=minor observations requiring corrective action, Tinggi=major nonconformity or potential record fraud.`,

    hr: `You are a procedural assistant for HR investigators conducting domestic inquiries in Malaysia (Employment Act 1955).
Phase: ${phase}
Recent excerpt: ${recent}
Full context: ${full}

Analyse the domestic inquiry statement and respond in JSON:
{
  "penemuan": ["facts or allegations requiring verification based on the statement, maximum 4"],
  "tahapRisiko": "Rendah | Sederhana | Tinggi",
  "justifikasiRisiko": "brief severity assessment of the disciplinary case based on available information",
  "sualanSusulan": ["follow-up inquiry question based on disciplinary procedures 1", "question 2", "question 3"],
  "pemerhatian": "brief summary of statement consistency and areas requiring scrutiny",
  "tindakan": ["recommended HR investigation action (witnesses, documents, etc.), maximum 3"],
  "redFlag": false,
  "redFlagNote": ""
}
Guide: Rendah=minor issue, Sederhana=policy breach requiring further investigation, Tinggi=serious misconduct potentially warranting termination or legal action.`,

    jkm: `You are an assessment assistant for Department of Social Welfare (JKM) officers in Malaysia.
REMINDER: Output is a supporting assessment guide only. Final decisions are the responsibility of the qualified welfare officer.

Phase: ${phase}
Recent excerpt: ${recent}
Full context: ${full}

Analyse the welfare interview and respond in JSON:
{
  "penemuan": ["risk indicators, signs of abuse/neglect, or welfare concerns detected, maximum 4"],
  "tahapRisiko": "Rendah | Sederhana | Tinggi",
  "justifikasiRisiko": "brief assessment of safety level and risk to the at-risk individual",
  "sualanSusulan": ["trauma-informed follow-up question to deepen risk assessment 1", "question 2", "question 3"],
  "pemerhatian": "welfare assessment summary including protective factors and identified risk factors",
  "tindakan": ["recommended welfare action, placement, or agency referral, maximum 3"],
  "redFlag": false,
  "redFlagNote": ""
}
Guide: Rendah=no immediate danger signs, Sederhana=concerns requiring monitoring and intervention, Tinggi=immediate danger risk — mandatory report and protective action required.`,

    peguam: `You are an analytical assistant for lawyers in client consultations or witness interviews in Malaysia, under the Legal Profession Act 1976 and Legal Professional Privilege principles.
Phase: ${phase}
Recent excerpt: ${recent}
Full context: ${full}

Analyse the legal conversation and respond in JSON:
{
  "penemuan": ["factual gaps, legal risks, or matters requiring verification, maximum 4"],
  "tahapRisiko": "Rendah | Sederhana | Tinggi",
  "justifikasiRisiko": "brief assessment of case strength and legal risk",
  "sualanSusulan": ["follow-up question to client or witness to fill factual gaps 1", "question 2", "question 3"],
  "pemerhatian": "brief analysis of case strengths, weaknesses, and opportunities so far",
  "tindakan": ["recommended legal action, investigation, or litigation strategy, maximum 3"],
  "redFlag": false,
  "redFlagNote": ""
}
Guide: Rendah=clear facts and strong case, Sederhana=gaps or risks requiring attention, Tinggi=serious legal risk or potential conflict of interest.`,

    court: `You are a legal assistant for lawyers or judges in Malaysian court proceedings under the Evidence Act 1950 and Criminal Procedure Code.
Phase: ${phase}
Recent excerpt: ${recent}
Full context: ${full}

Analyse the evidence and court proceedings, respond in JSON:
{
  "penemuan": ["weaknesses, contradictions, or gaps in witness testimony detected, maximum 4"],
  "tahapRisiko": "Rendah | Sederhana | Tinggi",
  "justifikasiRisiko": "brief assessment of testimony credibility and case strength",
  "sualanSusulan": ["effective cross-examination or follow-up question 1", "question 2", "question 3"],
  "pemerhatian": "brief analysis of the strength or weakness of testimony given so far",
  "tindakan": ["recommended cross-examination strategy, argument, or legal action, maximum 3"],
  "redFlag": false,
  "redFlagNote": ""
}
Guide: Rendah=consistent and strong testimony, Sederhana=gaps or contradictions that can be challenged, Tinggi=testimony unreliable or signs of contempt/perjury.`,
  };

  return (prompts[profession] || prompts.police) + '\n\nAll text in English. Analyse only based on what is STATED in the conversation.';
}

function buildGenericPrompt(profession, phase, question, recentTranscript) {
  return `You are a professional interview assistant for ${profession} Malaysia.
Current phase: ${phase}
Latest question: "${question}"
Recent transcript excerpt:
${recentTranscript.join('\n') || '(none yet)'}

Reply in JSON only (no other text):
{
  "followUp": ["follow-up question 1", "follow-up question 2", "follow-up question 3"],
  "observation": "brief observation",
  "redFlag": false,
  "redFlagNote": ""
}
All text in English.`;
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
        `Session ${i + 1}: [${s.date}] ${s.subject} — Risk: ${s.riskLevel || 'Not analysed'}\nSummary: ${s.summary || 'No summary'}\n${s.findings ? 'Findings: ' + s.findings.join('; ') : ''}`
      ).join('\n\n');
      const casePrompt = `You are a professional case analyst for the VeriRec platform.

Case: ${case_title}
Number of sessions: ${case_summaries.length}

Session summaries:
${sessionLines}

Generate a comprehensive case summary in English covering:
1. Key themes and patterns detected across sessions
2. Case progression over time
3. Cumulative risk and overall risk level
4. Concrete follow-up action recommendations

Format the response in 4 clear, well-structured paragraphs. Do not use bullet points. Write in a professional tone appropriate for an official report.`;

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
