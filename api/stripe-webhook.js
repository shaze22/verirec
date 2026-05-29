import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { sendEmail, paymentFailedEmail, subscriptionCancelledEmail } from './_mailer.js';

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const PLAN_LIMITS = { free: 2, starter: 20, pro: 100, biz: -1 };

export const config = { api: { bodyParser: false } };

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
  let event;

  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const rawBody = Buffer.concat(chunks);
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
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

        // Fetch subscription to check if trial is active
        let status = 'active';
        let trialEnd = null;
        if (session.subscription) {
          try {
            const stripeSub = await stripe.subscriptions.retrieve(session.subscription);
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
        // Plan is stored in subscription metadata (set during checkout)
        const plan = sub.metadata?.plan;
        const userId = await getUserIdByCustomer(sub.customer);
        if (!userId) break;
        const updateData = { status: sub.status };
        if (plan && PLAN_LIMITS.hasOwnProperty(plan)) {
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
        // Reset monthly usage + clear warning flag on renewal
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
