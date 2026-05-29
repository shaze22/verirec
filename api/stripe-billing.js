import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function getUser(req) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  return error ? null : user;
}

async function getCustomerId(userId) {
  const { data } = await supabaseAdmin
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .single();
  return data?.stripe_customer_id ?? null;
}

// GET /api/stripe-billing  → list invoices
// POST /api/stripe-billing → create billing portal session
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = await getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    if (req.method === 'GET') {
      const customerId = await getCustomerId(user.id);
      if (!customerId) return res.status(200).json({ invoices: [] });

      const invoices = await stripe.invoices.list({ customer: customerId, limit: 5, status: 'paid' });
      return res.status(200).json({
        invoices: invoices.data.map(inv => ({
          id: inv.id,
          number: inv.number,
          amount_paid: inv.amount_paid,
          currency: inv.currency,
          created: inv.created,
          invoice_pdf: inv.invoice_pdf,
          hosted_invoice_url: inv.hosted_invoice_url,
        })),
      });
    }

    if (req.method === 'POST') {
      const customerId = await getCustomerId(user.id);
      if (!customerId) return res.status(400).json({ error: 'no_stripe_customer' });

      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${process.env.VITE_APP_URL}/settings`,
      });
      return res.status(200).json({ url: session.url });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('stripe-billing error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
