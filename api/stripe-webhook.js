import { createClient } from '@supabase/supabase-js';
import { createHmac, timingSafeEqual } from 'crypto';
import { sendEmail, paymentFailedEmail, subscriptionCancelledEmail } from './_mailer.js';

const clean = (v) => (v || '').replace(/^﻿/, '').trim();
const stripeKey = () => clean(process.env.STRIPE_SECRET_KEY);

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const PLAN_LIMITS = { free: 2, counselor: -1, pro: -1, starter: 5, biz: -1 };
const TOPUP_SESSIONS = { topup_1: 1, topup_5: 5, topup_10: 10 };

export const config = { api: { bodyParser: false } };

// Stripe webhook signature verification — no SDK needed
function verifyStripeSignature(rawBody, sigHeader, secret) {
  const parts = sigHeader.split(',').reduce((acc, part) => {
    const [k, v] = part.split('=');
    acc[k] = v;
    return acc;
  }, {});
  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) throw new Error('Invalid signature header');

  const payload = `${timestamp}.${rawBody}`;
  const expected = createHmac('sha256', secret).update(payload, 'utf8').digest('hex');

  const a = Buffer.from(signature, 'hex');
  const b = Buffer.from(expected, 'hex');
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error('Signature mismatch');
  }

  // Reject events older than 5 minutes
  if (Math.abs(Date.now() / 1000 - parseInt(timestamp)) > 300) {
    throw new Error('Timestamp too old');
  }
}

async function stripeGet(path) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    headers: { Authorization: `Bearer ${stripeKey()}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Stripe error');
  return data;
}

async function getUserIdByCustomer(customerId) {
  const { data } = await supabaseAdmin
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .single();
  return data?.user_id ?? null;
}

async function getUserEmail(userId) {
  try {
    const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(userId);
    return user?.email ?? null;
  } catch { return null; }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const sig = req.headers['stripe-signature'];
  const webhookSecret = clean(process.env.STRIPE_WEBHOOK_SECRET);
  let rawBody;
  let event;

  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    rawBody = Buffer.concat(chunks);
    verifyStripeSignature(rawBody.toString('utf8'), sig, webhookSecret);
    event = JSON.parse(rawBody.toString('utf8'));
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const { user_id, plan } = session.metadata || {};
        if (!user_id || !plan) break;

        // Topup purchase: increment extra_sessions, don't change plan
        if (TOPUP_SESSIONS[plan]) {
          const toAdd = TOPUP_SESSIONS[plan];
          const { data: sub } = await supabaseAdmin
            .from('subscriptions').select('extra_sessions').eq('user_id', user_id).single();
          await supabaseAdmin.from('subscriptions')
            .update({ extra_sessions: (sub?.extra_sessions ?? 0) + toAdd })
            .eq('user_id', user_id);
          break;
        }

        // Subscription purchase
        let status = 'active';
        let trialEnd = null;
        if (session.subscription) {
          try {
            const stripeSub = await stripeGet(`/subscriptions/${session.subscription}`);
            if (stripeSub.status === 'trialing') {
              status = 'trialing';
              trialEnd = new Date(stripeSub.trial_end * 1000).toISOString();
            }
          } catch { /* non-fatal */ }
        }

        await supabaseAdmin.from('subscriptions').update({
          plan,
          status,
          sessions_limit: PLAN_LIMITS[plan] ?? 2,
          stripe_subscription_id: session.subscription,
          next_billing_date: trialEnd ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        }).eq('user_id', user_id);
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const plan = sub.metadata?.plan;
        const userId = await getUserIdByCustomer(sub.customer);
        if (!userId) break;
        const updateData = { status: sub.status };
        if (plan && Object.hasOwn(PLAN_LIMITS, plan)) {
          updateData.plan = plan;
          updateData.sessions_limit = PLAN_LIMITS[plan];
        }
        if (sub.current_period_end) {
          updateData.next_billing_date = new Date(sub.current_period_end * 1000).toISOString();
        }
        await supabaseAdmin.from('subscriptions').update(updateData).eq('user_id', userId);
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const userId = await getUserIdByCustomer(sub.customer);
        if (!userId) break;
        const plan = sub.metadata?.plan || 'starter';
        const planLabels = { starter: 'Starter', pro: 'Pro', biz: 'Perniagaan' };
        await supabaseAdmin.from('subscriptions').update({
          plan: 'free',
          status: 'active',
          sessions_limit: 2,
          stripe_subscription_id: null,
          next_billing_date: null,
        }).eq('user_id', userId);
        const email = await getUserEmail(userId);
        if (email) {
          const { subject, html } = subscriptionCancelledEmail(planLabels[plan] || plan);
          await sendEmail({ to: email, subject, html });
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const userId = await getUserIdByCustomer(invoice.customer);
        if (!userId) break;
        await supabaseAdmin.from('subscriptions').update({ status: 'past_due' }).eq('user_id', userId);
        const email = await getUserEmail(userId);
        if (email) {
          const { subject, html } = paymentFailedEmail();
          await sendEmail({ to: email, subject, html });
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        if (invoice.billing_reason === 'subscription_create') break;
        const userId = await getUserIdByCustomer(invoice.customer);
        if (!userId) break;
        await supabaseAdmin.from('subscriptions').update({
          status: 'active',
          sessions_used: 0,
          warning_sent: false,
          billing_cycle_start: new Date().toISOString(),
          next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        }).eq('user_id', userId);
        break;
      }
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('Webhook processing error:', err);
    return res.status(200).json({ received: true });
  }
}
