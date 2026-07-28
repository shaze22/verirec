import { createClient } from '@supabase/supabase-js';

// Strip BOM (U+FEFF) and whitespace — PowerShell echo adds BOM to env vars
const clean = (v) => (v || '').replace(/^﻿/, '').trim();
const stripeKey = () => clean(process.env.STRIPE_SECRET_KEY);

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const PRICE_IDS = {
  pro_monthly:       clean(process.env.STRIPE_PRICE_PRO_MONTHLY),
  counselor_monthly: clean(process.env.STRIPE_PRICE_COUNSELOR_MONTHLY),
  topup_1:           clean(process.env.STRIPE_PRICE_TOPUP_1),
  topup_5:           clean(process.env.STRIPE_PRICE_TOPUP_5),
  topup_10:          clean(process.env.STRIPE_PRICE_TOPUP_10),
};

// Source of truth for pricing (mirrors src/config.js — USD).
// Used when the configured price ID is missing or no longer exists in the
// live Stripe account, so checkout never dies on a stale env var.
const PLAN_PRICING = {
  pro:       { amount: 2200, name: 'VeriRec Unlimited', recurring: true },
  counselor: { amount: 2200, name: 'Kaunselor Unlimited', recurring: true },
  topup_1:   { amount: 300,  name: '1 Extra Session' },
  topup_5:   { amount: 1200, name: '5 Extra Sessions' },
  topup_10:  { amount: 2200, name: '10 Extra Sessions' },
};

function inlinePriceParams(plan) {
  const p = PLAN_PRICING[plan];
  if (!p) return null;
  const params = {
    'line_items[0][price_data][currency]': 'usd',
    'line_items[0][price_data][unit_amount]': p.amount,
    'line_items[0][price_data][product_data][name]': p.name,
    'line_items[0][quantity]': 1,
  };
  if (p.recurring) params['line_items[0][price_data][recurring][interval]'] = 'month';
  return params;
}

// Direct Stripe REST API calls — no SDK, no connection issues
// Keys contain literal [] (e.g. line_items[0][price]) — must NOT be encoded
function toFormBody(params) {
  return Object.entries(params)
    .filter(([, v]) => v !== null && v !== undefined)
    .map(([k, v]) => {
      // Preserve {} for Stripe template vars like {CHECKOUT_SESSION_ID}
      const encoded = encodeURIComponent(String(v))
        .replace(/%7B/g, '{').replace(/%7D/g, '}');
      return `${k}=${encoded}`;
    })
    .join('&');
}

async function stripePost(path, params) {
  const key = stripeKey();
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: toFormBody(params),
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
    const { plan, annual = false, origin } = body;
    const baseUrl = origin || process.env.VITE_APP_URL || 'https://www.verirec.app';

    // Invoice payment — one-time MYR checkout for client portal
    if (plan === 'invoice') {
      const { invoice_id } = body;
      if (!invoice_id) return res.status(400).json({ error: 'Missing invoice_id' });

      // Amount comes from the DB, never from the client — otherwise the payer
      // could set their own price. Ownership is checked against the subject.
      const { data: invoice, error: invErr } = await supabaseAdmin
        .from('counselor_invoices')
        .select('id, user_id, subject_id, invoice_number, total, status, subjects(portal_user_id, email)')
        .eq('id', invoice_id)
        .maybeSingle();
      if (invErr) throw invErr;
      if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
      if (invoice.status === 'paid') return res.status(409).json({ error: 'This invoice is already paid.' });
      if (invoice.status === 'cancelled') return res.status(409).json({ error: 'This invoice was cancelled.' });

      const client = invoice.subjects;
      const isClient = client && (client.portal_user_id === user.id ||
        (client.email && user.email && client.email.toLowerCase() === user.email.toLowerCase()));
      if (!isClient) return res.status(403).json({ error: 'This invoice does not belong to your account.' });

      const amountCents = Math.round(Number(invoice.total) * 100);
      if (!Number.isFinite(amountCents) || amountCents < 200) {
        return res.status(400).json({ error: 'Invoice total is below the minimum chargeable amount (MYR 2.00).' });
      }

      const sessionParams = {
        'payment_method_types[0]': 'card',
        'line_items[0][price_data][currency]': 'myr',
        'line_items[0][price_data][unit_amount]': amountCents,
        'line_items[0][price_data][product_data][name]': invoice.invoice_number ? `Invoice ${invoice.invoice_number}` : 'Counseling Invoice',
        'line_items[0][quantity]': 1,
        mode: 'payment',
        customer_email: user.email,
        success_url: `${baseUrl}/portal/home?tab=invoices&payment=success`,
        cancel_url: `${baseUrl}/portal/home?tab=invoices`,
        'metadata[invoice_id]': invoice.id,
        // The counselor owns the invoice row — the webhook matches on this,
        // not on the paying client's id.
        'metadata[counselor_id]': invoice.user_id,
        'metadata[user_id]': user.id,
        'metadata[plan]': 'invoice',
      };
      const session = await stripePost('/checkout/sessions', sessionParams);
      return res.status(200).json({ url: session.url });
    }

    const isTopup = plan.startsWith('topup_');
    if (!['pro', 'counselor', 'topup_1', 'topup_5', 'topup_10'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan' });
    }

    const priceKey = isTopup ? plan : `${plan}_monthly`;
    const priceId = PRICE_IDS[priceKey];

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
      const customer = await stripePost('/customers', { email: user.email, 'metadata[user_id]': user.id, description: 'VeriRec Kaunselor' });
      customerId = customer.id;
      await supabaseAdmin
        .from('subscriptions')
        .update({ stripe_customer_id: customerId })
        .eq('user_id', user.id);
    }

    // NOTE: Checkout Sessions do NOT accept `automatic_payment_methods` (that is a
    // PaymentIntent parameter) — sending it makes Stripe reject every request.
    // Leaving it out lets Checkout use the methods enabled in the dashboard.
    const sessionParams = {
      customer: customerId,
      success_url: `${baseUrl}/settings?payment=success&plan=${plan}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/pricing?payment=cancelled`,
      'metadata[user_id]': user.id,
      'metadata[plan]': plan,
    };

    sessionParams.mode = isTopup ? 'payment' : 'subscription';
    if (!isTopup) {
      sessionParams['subscription_data[metadata][user_id]'] = user.id;
      sessionParams['subscription_data[metadata][plan]'] = plan;
    }

    const inline = inlinePriceParams(plan);
    let session;
    if (priceId) {
      try {
        session = await stripePost('/checkout/sessions', {
          ...sessionParams,
          'line_items[0][price]': priceId,
          'line_items[0][quantity]': 1,
        });
      } catch (err) {
        // Stale env var: the price was archived, deleted, or belongs to another
        // Stripe account. Fall back to inline pricing instead of blocking the sale.
        if (!/no such price/i.test(err.message) || !inline) throw err;
        console.error(`Price ${priceId} (${priceKey}) not found in this Stripe account — using inline price_data`);
        session = await stripePost('/checkout/sessions', { ...sessionParams, ...inline });
      }
    } else {
      if (!inline) return res.status(400).json({ error: 'Price not configured: ' + priceKey });
      session = await stripePost('/checkout/sessions', { ...sessionParams, ...inline });
    }

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
