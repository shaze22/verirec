import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Map plan+annual to Stripe price IDs (set these in Stripe dashboard)
const PRICE_IDS = {
  starter_monthly:   process.env.STRIPE_PRICE_STARTER_MONTHLY,
  starter_annual:    process.env.STRIPE_PRICE_STARTER_ANNUAL,
  pro_monthly:       process.env.STRIPE_PRICE_PRO_MONTHLY,
  pro_annual:        process.env.STRIPE_PRICE_PRO_ANNUAL,
  biz_monthly:       process.env.STRIPE_PRICE_BIZ_MONTHLY,
  biz_annual:        process.env.STRIPE_PRICE_BIZ_ANNUAL,
  counselor_monthly: process.env.STRIPE_PRICE_COUNSELOR_MONTHLY,
  counselor_annual:  process.env.STRIPE_PRICE_COUNSELOR_ANNUAL,
  // One-time top-up packs (no _annual variant)
  topup_1:           process.env.STRIPE_PRICE_TOPUP_1,
  topup_5:           process.env.STRIPE_PRICE_TOPUP_5,
  topup_10:          process.env.STRIPE_PRICE_TOPUP_10,
};

const TOPUP_SESSIONS = { topup_1: 1, topup_5: 5, topup_10: 10 };

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(500).json({ error: 'Stripe not configured' });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

    const body = await readBody(req);
    const { plan, annual = false } = body;

    const isTopup = plan in TOPUP_SESSIONS;
    const isSubscription = ['starter', 'pro', 'biz', 'counselor'].includes(plan);

    if (!isTopup && !isSubscription) {
      return res.status(400).json({ error: 'Invalid plan' });
    }

    const priceKey = isTopup ? plan : `${plan}_${annual ? 'annual' : 'monthly'}`;
    const priceId = PRICE_IDS[priceKey];
    if (!priceId) return res.status(400).json({ error: 'Price not configured' });

    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    let customerId = sub?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email, metadata: { user_id: user.id } });
      customerId = customer.id;
      await supabaseAdmin
        .from('subscriptions')
        .update({ stripe_customer_id: customerId })
        .eq('user_id', user.id);
    }

    let sessionParams = {
      customer: customerId,
      automatic_payment_methods: { enabled: true },
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.VITE_APP_URL}/settings?payment=success`,
      cancel_url:  `${process.env.VITE_APP_URL}/pricing?payment=cancelled`,
      metadata: { user_id: user.id, plan },
    };

    if (isTopup) {
      sessionParams.mode = 'payment';
      sessionParams.metadata.topup_sessions = String(TOPUP_SESSIONS[plan]);
    } else {
      sessionParams.mode = 'subscription';
      sessionParams.subscription_data = {
        trial_period_days: 14,
        metadata: { user_id: user.id, plan },
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('stripe-checkout error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
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
