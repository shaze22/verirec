import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const PLAN_LIMITS = { starter: 20, pro: 100, biz: -1 };

export const config = { api: { bodyParser: false } };

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
        await supabaseAdmin.from('subscriptions').update({
          plan,
          status: 'active',
          sessions_limit: PLAN_LIMITS[plan] ?? 3,
          stripe_subscription_id: session.subscription,
          next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        }).eq('user_id', user_id);
        break;
      }
      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const { data: dbSub } = await supabaseAdmin
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_subscription_id', sub.id)
          .single();
        if (!dbSub) break;
        const plan = sub.metadata?.plan || 'free';
        await supabaseAdmin.from('subscriptions').update({
          plan,
          status: sub.status,
          sessions_limit: PLAN_LIMITS[plan] ?? 3,
        }).eq('user_id', dbSub.user_id);
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const { data: dbSub } = await supabaseAdmin
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_subscription_id', sub.id)
          .single();
        if (!dbSub) break;
        await supabaseAdmin.from('subscriptions').update({
          plan: 'free',
          status: 'active',
          sessions_limit: 3,
          stripe_subscription_id: null,
        }).eq('user_id', dbSub.user_id);
        break;
      }
    }
    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('Webhook processing error:', err);
    return res.status(200).json({ received: true });
  }
}
