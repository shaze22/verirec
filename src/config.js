export const CONFIG = {
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL,
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  },
  stripe: {
    publicKey: import.meta.env.VITE_STRIPE_PUBLIC_KEY,
  },
  app: {
    url: import.meta.env.VITE_APP_URL || 'http://localhost:5173',
    isDev: import.meta.env.DEV,
  },
  api: {
    transcribe:     '/api/gemini',
    suggest:        '/api/suggest',
    report:         '/api/report',
    gemini:         '/api/gemini',
    stripeCheckout:  '/api/stripe-checkout',
    stripeBilling:   '/api/stripe-billing',
  },
  plans: {
    free:      { sessions: 2,  users: 1, price: 0,  currency: 'USD', label: 'Free' },
    counselor: { sessions: -1, users: 1, price: 22, currency: 'USD', label: 'Counselor' },
    pro:       { sessions: -1, users: 1, price: 22, currency: 'USD', label: 'Unlimited' },
    // Legacy plans kept for backward-compat with existing subscribers
    starter:   { sessions: 5,  users: 2, price: 25, currency: 'USD', label: 'Professional' },
    biz:       { sessions: -1, users: -1, price: 599, currency: 'USD', label: 'Business' },
  },
  planOrder: { free: 0, counselor: 1, pro: 1, starter: 1, biz: 2 },
  topups: [
    { key: 'topup_1',  label: '1 Session',   price: 3,  perSession: 3   },
    { key: 'topup_5',  label: '5 Sessions',  price: 12, perSession: 2.4 },
    { key: 'topup_10', label: '10 Sessions', price: 22, perSession: 2.2 },
  ],
};
