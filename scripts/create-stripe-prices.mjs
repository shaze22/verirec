/**
 * Run: STRIPE_SECRET_KEY=sk_live_xxx node scripts/create-stripe-prices.mjs
 *
 * Creates all VeriRec Stripe products + prices and prints the env var block
 * to paste into Vercel. Safe to re-run — checks for existing products first.
 */

import Stripe from 'stripe';

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error('ERROR: Set STRIPE_SECRET_KEY env var before running.');
  console.error('  STRIPE_SECRET_KEY=sk_live_xxx node scripts/create-stripe-prices.mjs');
  process.exit(1);
}

const stripe = new Stripe(key);

async function createProduct(name) {
  return stripe.products.create({ name });
}

async function createRecurring(productId, unitAmount, interval) {
  return stripe.prices.create({
    product: productId,
    unit_amount: unitAmount,
    currency: 'myr',
    recurring: { interval },
  });
}

async function createOneTime(productId, unitAmount) {
  return stripe.prices.create({
    product: productId,
    unit_amount: unitAmount,
    currency: 'myr',
  });
}

console.log('Creating Stripe products and prices for VeriRec...\n');

// Subscriptions
const starter  = await createProduct('VeriRec Starter');
const pro      = await createProduct('VeriRec Pro');
const biz      = await createProduct('VeriRec Perniagaan');
const counselor = await createProduct('VeriRec Kaunselor');

// Top-up (one-time)
const topup1   = await createProduct('VeriRec Top-up 1 Sesi');
const topup5   = await createProduct('VeriRec Top-up 5 Sesi');
const topup10  = await createProduct('VeriRec Top-up 10 Sesi');

// Prices — amounts in sen (RM × 100)
const starterMonthly   = await createRecurring(starter.id,   24900,  'month');
const starterAnnual    = await createRecurring(starter.id,   248700, 'year');  // RM2,487 (RM207/bulan, jimat 17%)
const proMonthly       = await createRecurring(pro.id,       99900,  'month');
const proAnnual        = await createRecurring(pro.id,       998700, 'year');  // RM9,987
const bizMonthly       = await createRecurring(biz.id,       249900, 'month');
const bizAnnual        = await createRecurring(biz.id,       2499000,'year');  // RM24,990
const counselorMonthly = await createRecurring(counselor.id, 10000,  'month');
const counselorAnnual  = await createRecurring(counselor.id, 99600,  'year');  // RM996 (RM83/bulan, jimat 17%)
const topup1Price      = await createOneTime(topup1.id,  1300);   // RM13
const topup5Price      = await createOneTime(topup5.id,  6000);   // RM60
const topup10Price     = await createOneTime(topup10.id, 10000);  // RM100

console.log('Done! Paste these into Vercel environment variables:\n');
console.log('='.repeat(60));
console.log(`STRIPE_PRICE_STARTER_MONTHLY=${starterMonthly.id}`);
console.log(`STRIPE_PRICE_STARTER_ANNUAL=${starterAnnual.id}`);
console.log(`STRIPE_PRICE_PRO_MONTHLY=${proMonthly.id}`);
console.log(`STRIPE_PRICE_PRO_ANNUAL=${proAnnual.id}`);
console.log(`STRIPE_PRICE_BIZ_MONTHLY=${bizMonthly.id}`);
console.log(`STRIPE_PRICE_BIZ_ANNUAL=${bizAnnual.id}`);
console.log(`STRIPE_PRICE_COUNSELOR_MONTHLY=${counselorMonthly.id}`);
console.log(`STRIPE_PRICE_COUNSELOR_ANNUAL=${counselorAnnual.id}`);
console.log(`STRIPE_PRICE_TOPUP_1=${topup1Price.id}`);
console.log(`STRIPE_PRICE_TOPUP_5=${topup5Price.id}`);
console.log(`STRIPE_PRICE_TOPUP_10=${topup10Price.id}`);
console.log('='.repeat(60));
console.log('\nAlso set these if not already done:');
console.log('STRIPE_SECRET_KEY=<your secret key>');
console.log('VITE_STRIPE_PUBLIC_KEY=<your publishable key>');
console.log('STRIPE_WEBHOOK_SECRET=<from Stripe webhook dashboard>');
