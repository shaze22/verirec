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
    transcribe:     '/api/transcribe',
    suggest:        '/api/suggest',
    report:         '/api/report',
    gemini:         '/api/gemini',
    stripeCheckout:  '/api/stripe-checkout',
    stripeBilling:   '/api/stripe-billing',
  },
  plans: {
    free:      { sessions: 2,   users: 1,  price: 0,    label: 'Percuma' },
    counselor: { sessions: 20,  users: 1,  price: 100,  label: 'Kaunselor' },
    starter:   { sessions: 20,  users: 2,  price: 249,  label: 'Starter' },
    pro:       { sessions: 100, users: 10, price: 999,  label: 'Pro' },
    biz:       { sessions: 200, users: -1, price: 2499, label: 'Business' },
  },
  topups: [
    { key: 'topup_1',  sessions: 1,  price: 13,  label: '1 Sesi',   perSession: 13 },
    { key: 'topup_5',  sessions: 5,  price: 60,  label: '5 Sesi',   perSession: 12 },
    { key: 'topup_10', sessions: 10, price: 100, label: '10 Sesi',  perSession: 10 },
  ],
  planOrder: { free: 0, counselor: 1, starter: 1, pro: 2, biz: 3 },
};
