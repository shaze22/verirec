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
    free:      { sessions: 2,   users: 1,  price: 0,   currency: 'USD', label: 'Free' },
    counselor: { sessions: -1,  users: 1,  price: 22,  currency: 'USD', label: 'Counselor' },
    starter:   { sessions: 5,   users: 2,  price: 25,  currency: 'USD', label: 'Professional' },
    pro:       { sessions: 100, users: 10, price: 249, currency: 'USD', label: 'Pro' },
    biz:       { sessions: 200, users: -1, price: 599, currency: 'USD', label: 'Business' },
  },
  planOrder: { free: 0, counselor: 1, starter: 1, pro: 2, biz: 3 },
};
