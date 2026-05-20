# VeriRec — Project Context

## What is VeriRec?
Production SaaS for professional interview recording and intelligence in Malaysia.

**Users:** Counselors, Police, MACC/SPRM, Doctors, ISO Auditors, HR Investigators
**Stack:** React + Vite, Supabase, OpenAI Whisper, Anthropic Claude, Stripe + Billplz, Vercel

## Key Rules
1. **Never call OpenAI, Anthropic, Stripe, or Billplz APIs from the browser** — all go through `/api/` routes
2. **Never store secrets in `src/`** — only `VITE_` prefixed vars allowed in frontend code
3. **All UI text in Bahasa Malaysia** — code comments in English
4. **Every async function needs try/catch** — no silent failures
5. **Consent data must never be deleted** — PDPA compliance requires permanent audit trail
6. **SHA-256 hash is computed server-side** in `api/report.js` — not client-side

## Architecture
- `src/` — React frontend (Vite)
- `api/` — Vercel serverless functions (Node.js)
- `supabase/` — SQL schema and seed data
- `src/lib/` — Core libraries (Supabase, IndexedDB, crypto, sync)
- `src/api/` — Frontend API clients (route through /api/)
- `src/store/` — Zustand state (auth, billing)

## Data Flow
1. User records audio via MediaRecorder
2. Audio chunks sent to `/api/transcribe` (→ OpenAI Whisper)
3. AI suggestions via `/api/suggest` (→ Anthropic Claude)
4. Session saved to Supabase + IndexedDB (offline support)
5. End session → `/api/report` generates structured report + SHA-256 hash

## Plans
| Plan    | Sessions | Price/month |
|---------|----------|-------------|
| Percuma | 3        | RM0         |
| Starter | 20       | RM149       |
| Pro     | 100      | RM399       |
| Business| ∞        | RM899       |

## Environment
- Frontend: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_STRIPE_PUBLIC_KEY`, `VITE_APP_URL`
- Backend: `SUPABASE_SERVICE_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `STRIPE_SECRET_KEY`, etc.
