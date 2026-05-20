import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const PLAN_PRICES_CENTS = { starter: 14900, pro: 39900, biz: 89900 };
const PLAN_LABELS = { starter: 'VeriRec Starter', pro: 'VeriRec Pro', biz: 'VeriRec Business' };

const BILLPLZ_BASE = process.env.BILLPLZ_SANDBOX === 'true'
  ? 'https://www.billplz-sandbox.com/api/v3'
  : 'https://www.billplz.com/api/v3';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

    const body = await readBody(req);
    const { plan, annual = false } = body;

    if (!['starter', 'pro', 'biz'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan' });
    }

    const amount = PLAN_PRICES_CENTS[plan] * (annual ? 10 : 1);

    const billplzRes = await fetch(`${BILLPLZ_BASE}/bills`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`${process.env.BILLPLZ_API_KEY}:`).toString('base64')}`,
      },
      body: JSON.stringify({
        collection_id: process.env.BILLPLZ_COLLECTION_ID,
        email: user.email,
        name: user.user_metadata?.full_name || user.email,
        amount,
        description: `${PLAN_LABELS[plan]}${annual ? ' (Tahunan)' : ' (Bulanan)'}`,
        callback_url: `${process.env.VITE_APP_URL}/api/billplz-callback`,
        redirect_url: `${process.env.VITE_APP_URL}/settings?payment=success`,
        reference_1_label: 'user_id',
        reference_1: user.id,
        reference_2_label: 'plan',
        reference_2: plan,
      }),
    });

    if (!billplzRes.ok) {
      const err = await billplzRes.text();
      console.error('Billplz error:', err);
      return res.status(500).json({ error: 'Payment gateway error' });
    }

    const bill = await billplzRes.json();

    await supabaseAdmin.from('subscriptions')
      .update({ billplz_bill_id: bill.id })
      .eq('user_id', user.id);

    return res.status(200).json({ url: bill.url });
  } catch (err) {
    console.error('billplz-create error:', err);
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
