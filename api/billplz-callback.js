import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const PLAN_LIMITS = { starter: 20, pro: 100, biz: -1 };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = await readBody(req);
    const { id, paid, paid_at, paid_amount, x_signature, reference_1, reference_2 } = body;

    // Verify Billplz X-Signature
    const signatureBase = `${paid}|${id}|${reference_1}|${paid_at}|${paid_amount}`;
    const expectedSig = crypto
      .createHmac('sha256', process.env.BILLPLZ_X_SIGNATURE)
      .update(signatureBase)
      .digest('hex');

    if (expectedSig !== x_signature) {
      console.error('Invalid Billplz signature');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    if (paid !== 'true') return res.status(200).json({ ok: true });

    const userId = reference_1;
    const plan = reference_2;

    if (!userId || !plan || !PLAN_LIMITS.hasOwnProperty(plan)) {
      return res.status(400).json({ error: 'Invalid callback data' });
    }

    await supabaseAdmin.from('subscriptions').update({
      plan,
      status: 'active',
      sessions_limit: PLAN_LIMITS[plan],
      next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }).eq('user_id', userId);

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('billplz-callback error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const params = new URLSearchParams(body);
        const obj = {};
        for (const [k, v] of params) obj[k] = v;
        resolve(obj);
      } catch { reject(new Error('Invalid body')); }
    });
    req.on('error', reject);
  });
}
