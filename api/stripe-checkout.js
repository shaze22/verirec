import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const PRICE_IDS = {
  starter_monthly:   clean(process.env.STRIPE_PRICE_STARTER_MONTHLY),
  starter_annual:    clean(process.env.STRIPE_PRICE_STARTER_ANNUAL),
  pro_monthly:       clean(process.env.STRIPE_PRICE_PRO_MONTHLY),
  pro_annual:        clean(process.env.STRIPE_PRICE_PRO_ANNUAL),
  biz_monthly:       clean(process.env.STRIPE_PRICE_BIZ_MONTHLY),
  biz_annual:        clean(process.env.STRIPE_PRICE_BIZ_ANNUAL),
  counselor_monthly: clean(process.env.STRIPE_PRICE_COUNSELOR_MONTHLY),
  counselor_annual:  clean(process.env.STRIPE_PRICE_COUNSELOR_ANNUAL),
  topup_1:           clean(process.env.STRIPE_PRICE_TOPUP_1),
  topup_5:           clean(process.env.STRIPE_PRICE_TOPUP_5),
  topup_10:          clean(process.env.STRIPE_PRICE_TOPUP_10),
};

const TOPUP_SESSIONS = { topup_1: 1, topup_5: 5, topup_10: 10 };

// Strip BOM (U+FEFF) and whitespace — PowerShell echo adds BOM to env vars
const clean = (v) => (v || '').replace(/^﻿/, '').trim();
const stripeKey = () => clean(process.env.STRIPE_SECRET_KEY);

// Direct Stripe REST API calls — no SDK, no connection issues
async function stripePost(path, params) {
  const key = stripeKey();
  const body = new URLSearchParams();
  function flatten(obj, prefix = '') {
    for (const [k, v] of Object.entries(obj)) {
      const key = prefix ? `${prefix}[${k}]` : k;
      if (v !== null && typeof v === 'object' && !Array.isArray(v)) flatten(v, key);
      else body.append(key, String(v));
    }
  }
  flatten(params);

  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Stripe error');
  return data;
}

async function stripeGet(path) {
  const key = stripeKey();
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  const data = await res.json();
  if (!res.ok) throw Object.assign(new Error(data.error?.message || 'Stripe error'), { code: data.error?.code });
  return data;
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(500).json({ error: 'Stripe not configured' });
  }

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
    if (!priceId) return res.status(400).json({ error: 'Price not configured: ' + priceKey });

    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    let customerId = sub?.stripe_customer_id;
    if (customerId) {
      try {
        const cus = await stripeGet(`/customers/${customerId}`);
        if (cus.deleted) customerId = null;
      } catch (e) {
        if (e.code === 'resource_missing') customerId = null;
        else throw e;
      }
    }
    if (!customerId) {
      const customer = await stripePost('/customers', { email: user.email, 'metadata[user_id]': user.id });
      customerId = customer.id;
      await supabaseAdmin
        .from('subscriptions')
        .update({ stripe_customer_id: customerId })
        .eq('user_id', user.id);
    }

    const sessionParams = {
      customer: customerId,
      'payment_method_types[0]': 'card',
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': 1,
      success_url: `${process.env.VITE_APP_URL}/settings?payment=success`,
      cancel_url: `${process.env.VITE_APP_URL}/pricing?payment=cancelled`,
      'metadata[user_id]': user.id,
      'metadata[plan]': plan,
    };

    if (isTopup) {
      sessionParams.mode = 'payment';
      sessionParams['metadata[topup_sessions]'] = String(TOPUP_SESSIONS[plan]);
    } else {
      sessionParams.mode = 'subscription';
      sessionParams['subscription_data[trial_period_days]'] = 14;
      sessionParams['subscription_data[metadata][user_id]'] = user.id;
      sessionParams['subscription_data[metadata][plan]'] = plan;
    }

    const session = await stripePost('/checkout/sessions', sessionParams);

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
