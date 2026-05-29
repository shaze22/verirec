# VeriRec — Project Context

## Apa itu VeriRec?
SaaS rakaman temuduga profesional untuk Malaysia. AI transcribe + analisa perbualan secara real-time.

**Pengguna:** Kaunselor, Polis, SPRM/MACC, Doktor, Juruaudit ISO, Penyiasat HR, Mahkamah, Peguam, Pegawai JKM (9 profesion)

## Tech Stack
- React + Vite (JSX, bukan TypeScript)
- Tailwind CSS v3
- Supabase (auth + database)
- OpenAI Whisper (transcription) via `/api/transcribe`
- Anthropic Claude `claude-opus-4-7` (AI analysis) via `/api/suggest`
- Google Gemini `gemini-2.5-flash` (ready, via `/api/gemini`)
- Stripe + Billplz (payments)
- Vercel (deployment)

## Peraturan Wajib
1. **Jangan panggil OpenAI/Anthropic/Stripe/Gemini dari browser** — semua melalui `/api/` routes
2. **Jangan simpan secrets dalam `src/`** — hanya `VITE_` prefix dibenarkan di frontend
3. **Semua UI text dalam Bahasa Malaysia** — code comments dalam English
4. **Setiap async function perlu try/catch** — tiada silent failures
5. **Consent data mesti tidak pernah dipadam** — PDPA compliance, audit trail kekal
6. **SHA-256 hash dikira server-side** dalam `api/report.js` — bukan client-side
7. **Bid/harga dalam whole integer RM sahaja** — tiada decimal

## Struktur Projek
```
src/                    — React frontend (Vite)
  api/                  — Frontend API clients (call /api/ routes)
    claude.js           — suggestQuestions(), analyzeSession(), generateReport()
    gemini.js           — geminiGenerate()
  lib/                  — Supabase, IndexedDB, crypto, sync
  store/                — Zustand state (auth, billing)
  pages/                — Route pages
  components/           — UI components
api/                    — Vercel serverless functions (Node.js ESM)
  suggest.js            — Anthropic Claude AI analysis
  transcribe.js         — OpenAI Whisper transcription
  report.js             — Generate report + SHA-256 hash
  gemini.js             — Gemini AI endpoint
  stripe-*.js           — Payment routes
supabase/               — SQL schema + seed
```

## AI Models
| Provider  | Model             | Kegunaan               |
|-----------|-------------------|------------------------|
| Anthropic | claude-opus-4-7   | AI analysis (suggest)  |
| OpenAI    | whisper-1         | Audio transcription    |
| Gemini    | gemini-2.5-flash  | Ready, belum digunakan |

## 9 Profesion
| ID        | Label         | Route      | Warna   |
|-----------|---------------|------------|---------|
| counselor | Kaunselor     | /kaunselor | #10b981 |
| police    | Polis         | /polis     | #3b82f6 |
| sprm      | SPRM/MACC     | /sprm      | #8b5cf6 |
| doctor    | Doktor        | /doktor    | #ef4444 |
| iso       | Juruaudit ISO | /iso       | #f59e0b |
| hr        | Penyiasat HR  | /hr        | #6366f1 |
| court     | Mahkamah      | /mahkamah  | #1e40af |
| peguam    | Peguam        | /peguam    | #0891b2 |
| jkm       | Pegawai JKM   | /jkm       | #0d9488 |

## Plan & Harga
| Plan       | Sesi/bulan | Harga/bulan |
|------------|------------|-------------|
| Percuma    | 2          | RM0         |
| Starter    | 20         | RM249       |
| Pro        | 100        | RM999       |
| Perniagaan | 200        | RM2,499     |

## Environment Variables
```
# Frontend (VITE_ prefix wajib)
VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
VITE_STRIPE_PUBLIC_KEY, VITE_APP_URL

# Backend only (api/ routes)
SUPABASE_SERVICE_KEY
OPENAI_API_KEY
ANTHROPIC_API_KEY
GEMINI_API_KEY
STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_* (6 price IDs)
```

## Deployment
```bash
# Vercel auto-deploy atau manual:
vercel deploy --prod
```
