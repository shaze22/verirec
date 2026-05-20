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
    stripeCheckout: '/api/stripe-checkout',
    billplzCreate:  '/api/billplz-create',
  },
  plans: {
    free:    { sessions: 3,   users: 1,  price: 0,   label: 'Percuma' },
    starter: { sessions: 20,  users: 2,  price: 149,  label: 'Starter' },
    pro:     { sessions: 100, users: 10, price: 399,  label: 'Pro' },
    biz:     { sessions: -1,  users: -1, price: 899,  label: 'Business' },
  },
  planOrder: { free: 0, starter: 1, pro: 2, biz: 3 },
};
