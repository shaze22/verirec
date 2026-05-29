import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { prompt, model = 'gemini-2.5-flash', maxTokens = 1024 } = await readBody(req);

    if (!prompt) return res.status(400).json({ error: 'prompt is required' });

    const geminiModel = genAI.getGenerativeModel({
      model,
      generationConfig: { maxOutputTokens: maxTokens },
    });

    const result = await geminiModel.generateContent(prompt);
    const text = result.response.text();

    return res.status(200).json({ text });
  } catch (err) {
    console.error('gemini error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
