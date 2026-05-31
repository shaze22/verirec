# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands
```bash
npm run dev        # Start Vite dev server (frontend only, localhost:5173)
npm run build      # Production build
npm run preview    # Preview production build locally

# Deploy to production
vercel deploy --prod --force --scope syedshazni-7682s-projects

# Pull env vars from Vercel (values of secrets are redacted)
vercel env pull .env.local --environment production --scope syedshazni-7682s-projects
```

> API routes (`api/`) run as Vercel serverless functions — they are not served by `vite`. To test them locally, use `vercel dev` (requires Vercel CLI).

---

## Apa itu VeriRec?

**Dua platform, satu codebase:**

| Platform | URL | Fokus |
|----------|-----|-------|
| VeriRec Profesional | www.verirec.app | Soal siasat + audit — Polis, MACC, HR, ISO, Halal JAKIM, Peguam, Doktor, JKM dll |
| VeriRec Kaunselor | counselor.verirec.app | Pengurusan sesi kaunseling — fail klien, temujanji, assessment |

Pengesan subdomain via `src/lib/subdomain.js` (`isCounselorSubdomain()`, `isDoctorSubdomain()`, `isJKMSubdomain()`).

## Tech Stack
- React + Vite (JSX, bukan TypeScript)
- Tailwind CSS v3
- Supabase (auth + database)
- AssemblyAI `universal-3-pro` (speaker diarization, batch, on session end) via `/api/transcribe?mode=diarize`
- OpenAI Whisper `whisper-1` (real-time chunk transcription during recording) via `/api/transcribe`
- Anthropic Claude `claude-opus-4-7` (AI analysis) via `/api/suggest`
- Google Gemini `gemini-2.5-flash` (fallback untuk Claude 529/500) via `/api/suggest`
- Stripe (payments) — **Live mode aktif**, guna `fetch` terus (bukan SDK)
- Vercel (deployment)

## Peraturan Wajib
1. **Jangan panggil OpenAI/Anthropic/Stripe/Gemini dari browser** — semua melalui `/api/` routes
2. **Jangan simpan secrets dalam `src/`** — hanya `VITE_` prefix dibenarkan di frontend
3. **Semua UI text dalam Bahasa Malaysia** — code comments dalam English
4. **Setiap async function perlu try/catch** — tiada silent failures
5. **Consent data mesti tidak pernah dipadam** — PDPA compliance, audit trail kekal
6. **SHA-256 hash dikira server-side** dalam `api/report.js` — bukan client-side
7. **Bid/harga dalam whole integer RM sahaja** — tiada decimal
8. **Tiada free trial** — `trial_period_days` telah dibuang dari `stripe-checkout.js`

## Struktur Projek
```
src/
  api/                  — Frontend API clients (call /api/ routes)
  lib/                  — Supabase, IndexedDB, crypto, sync, subdomain, profConfig
  store/                — Zustand state (auth, billing)
  pages/
    LandingPage.jsx     — www.verirec.app (soal siasat focus, 4 kumpulan profesion)
    CounselorLandingPage.jsx  — counselor.verirec.app
    DoctorLandingPage.jsx     — doctor.verirec.app
    JKMLandingPage.jsx        — jkm.verirec.app
    kaunselor/          — Counselor-specific pages
    professional/       — Shared module (ProfDashboard, ProfClientsPage, ProfClientFilePage,
                          ProfAppointmentsPage, ProfCalendarPage, ProfSetupPage)
  components/
    session/
      PeaceModelPanel.jsx  — PEACE Model guide untuk investigation professions
      AssessmentPanel.jsx  — MBTI + RIASEC untuk kaunselor
api/                    — Vercel serverless functions (Node.js ESM) — MAX 12 (Hobby plan)
  suggest.js, transcribe.js, report.js, gemini.js
  stripe-billing.js, stripe-checkout.js, stripe-webhook.js
  admin.js, cron-reset-usage.js, share-session.js, team-invite.js, user-notifications.js
supabase/               — SQL schema + seed
```

## PEACE Model (SessionPage.jsx)
Panel panduan soal siasat berstruktur — 5 fasa dengan senarai semak dan tips.

```js
const isInvestigationProf = ['police','sprm','sispa','skmm','hr','jtk','peguam'].includes(setup.profession);
```
- Desktop xl+: kolum ke-4 (gantikan AssessmentPanel)
- Tablet md: toggle tab "PEACE Model" vs "Cadangan AI"
- Mobile: sub-tab dalam tab AI

Kaunselor, Doktor, JKM masih dapat AssessmentPanel (MBTI/RIASEC).

## Shared Professional Module (`src/pages/professional/`)
Digunakan oleh doctor.verirec.app dan jkm.verirec.app:
- `ProfDashboard.jsx` — dashboard stats + laporan bulanan PDF
- `ProfClientsPage.jsx` — senarai klien/pesakit/kes
- `ProfClientFilePage.jsx` — 8 tabs: Maklumat|Sesi|Kalendar|Kebenaran|Plan|Rujukan|Temujanji|Nota
- `ProfAppointmentsPage.jsx` — 4 tabs: Permintaan|Slot Masa|QR&Pautan|Rujukan Pasukan
- `ProfCalendarPage.jsx`, `ProfSetupPage.jsx`

Config per profesion: `src/lib/profConfig.js` → `PROF_CONFIG` objek (counselor/doctor/jkm).

## Hobby Plan — 12 Serverless Functions (HARD LIMIT)
Jangan tambah function baru tanpa remove/merge yang lain dulu.
Semasa: admin, cron-reset-usage, gemini, report, share-session, stripe-billing, stripe-checkout, stripe-webhook, suggest, team-invite, transcribe, user-notifications

## AI Models
| Provider    | Model                         | Kegunaan                              |
|-------------|-------------------------------|---------------------------------------|
| Anthropic   | claude-opus-4-7               | AI analysis (suggest)                 |
| AssemblyAI  | universal-3-pro / universal-2 | Speaker diarization (batch, on end)   |
| OpenAI      | whisper-1                     | Real-time chunk transcription         |
| Gemini      | gemini-2.5-flash              | Fallback bila Claude 529/500          |

## Profesion & Routing
| ID        | Label           | Route      | Warna   | Panel Sesi     |
|-----------|-----------------|------------|---------|----------------|
| counselor | Kaunselor       | /kaunselor | #10b981 | AssessmentPanel |
| police    | Polis           | /polis     | #3b82f6 | PeaceModelPanel |
| sprm      | SPRM/MACC       | /sprm      | #8b5cf6 | PeaceModelPanel |
| doctor    | Doktor          | /doktor    | #ef4444 | AssessmentPanel |
| iso       | Juruaudit ISO   | /iso       | #f59e0b | AssessmentPanel |
| hr        | Penyiasat HR    | /hr        | #6366f1 | PeaceModelPanel |
| peguam    | Peguam          | /peguam    | #0891b2 | PeaceModelPanel |
| jkm       | Pegawai JKM     | /jkm       | #0d9488 | AssessmentPanel |
| sispa     | SISPA           | /sispa     | #1e40af | PeaceModelPanel |
| skmm      | SKMM            | /skmm      | #0891b2 | PeaceModelPanel |
| jtk       | Pegawai JTK     | /jtk       | #0d9488 | PeaceModelPanel |

## Plan & Harga
| Plan        | Sesi/bulan | Harga/bulan | Top-up | Label UI      |
|-------------|------------|-------------|--------|---------------|
| free        | 2          | RM0         | Tidak  | Percuma       |
| counselor   | 10         | RM100       | Ya     | Kaunselor     |
| starter     | 10         | RM100       | Ya     | Profesional   |
| pro         | 100        | RM999       | Tidak  | Pro (hidden)  |
| biz         | 200        | RM2,499     | Tidak  | Enterprise → email |

**Top-up (counselor + starter):**
- 1 sesi: RM13 · 5 sesi: RM60 · 10 sesi: RM100
- Simpan dalam `subscriptions.extra_sessions` — tidak luput, tidak reset bulanan
- **TIADA free trial** — `trial_period_days` dibuang

**PricingPage dalam app (`/pricing`):**
- Tab "VeriRec Profesional": Percuma + Profesional (RM100) + top-up + Enterprise hubungi
- Tab "Kaunselor": Kaunselor (RM100) + top-up
- Pro/Biz tidak dipaparkan — hanya via Enterprise inquiry

## Counselor Module
- Public booking: `/book/:booking_code` → `PublicBookingPage.jsx`
- Kaunselor pages: `/kaunselor/setup|appointments|clients|clients/:id|calendar`
- API: `src/api/counselor.js` — all counselor CRUD
- 3 Supabase RPCs: `get_counselor_by_booking_code`, `get_booked_times`, `submit_appointment`
- `appointment_slots` dan `appointments` guna `counselor_id` (bukan `user_id`)
- Risk level: `none` / `mental_health` / `self_harm` / `suicidal`
- **GOTCHA**: appointments↔subjects ada 2 FK — guna `subjects!appointments_subject_id_fkey`
- **GOTCHA**: `user-notifications.js` select query mesti include `counselor_notes`

**Assessment Tools:**
- `AssessmentPanel.jsx` — MBTI 16 soalan BM + RIASEC 24 aktiviti Holland Code
- Auto-score → simpan ke `session_assessments` table

**SOP Kaunseling (10/10 ✅):**
- Print Intake CIF, Jana Memo Rujukan PDF, Case Session Note jsPDF, Tab Kebenaran print

## LandingPage (www.verirec.app)
4 kumpulan profesion dengan pain points + features per kumpulan:
1. **Penguatkuasa & Penyiasat** (biru) — Polis, MACC, SISPA, SKMM, Peguam, JTK
2. **HR & Disiplin Korporat** (indigo) — Penyiasat HR, Panel Tatatertib
3. **Audit & Pematuhan** (amber) — ISO, Halal JAKIM, Kualiti
4. **Klinikal & Kebajikan** (rose) — Doktor, JKM, Pekerja Sosial

Pricing section: Percuma (RM0) + Profesional (RM100/bulan, 10 sesi) + top-up table.

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
ASSEMBLYAI_API_KEY
STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_COUNSELOR_MONTHLY, STRIPE_PRICE_COUNSELOR_ANNUAL
STRIPE_PRICE_TOPUP_1, STRIPE_PRICE_TOPUP_5, STRIPE_PRICE_TOPUP_10
RESEND_API_KEY
TELEGRAM_BOT_TOKEN  ← belum set, perlu dapatkan dari @BotFather
```

## Deployment
```bash
vercel deploy --prod --force --scope syedshazni-7682s-projects
```
- www.verirec.app + counselor.verirec.app + doctor.verirec.app + jkm.verirec.app
- Project ID: `prj_EwnDU0nKMOn56auUR1WZF1GeNI3f`
- Last deployed: 2026-05-31 (commit `04b9e6d`)
- Supabase project ID: `sbakkkxuhkxfofpfhdtn`

## ⚠️ GOTCHA KRITIKAL — Stripe + Vercel

**1. PowerShell echo menambah BOM pada env vars**
Jangan guna `echo "value" | vercel env add ...`. Cara betul:
```powershell
$val = "sk_live_..."
[System.IO.File]::WriteAllText("$env:TEMP\ev.txt", $val, [System.Text.UTF8Encoding]::new($false))
Get-Content "$env:TEMP\ev.txt" | vercel env add VAR_NAME production --scope ...
Remove-Item "$env:TEMP\ev.txt"
```
Dalam code: `const clean = (v) => (v || '').replace(/^﻿/, '').trim()`

**2. Stripe SDK v22 tidak compatible dengan Vercel ESM**
Guna `fetch` terus ke `https://api.stripe.com/v1/...`. `encodeURIComponent()` pada VALUES sahaja.

**3. Stripe checkout success/cancel URL mesti guna `origin` dari request body**
Frontend hantar `window.location.origin` — jangan hardcode `VITE_APP_URL`.

**4. `toFormBody()` mesti preserve `{}`**
Replace `%7B/%7D` balik ke `{}` supaya Stripe template vars berfungsi.

## Email Domain (verirec.app)
- FROM: `noreply@verirec.app` dalam `api/_mailer.js`
- `RESEND_API_KEY` set dalam Vercel · DNS Verified ✅

## Test Account
- URL: `counselor.verirec.app`
- Email: `test.kaunselor@verirec.app` | Password: `Test1234!`
- Plan: Counselor (10 sesi) | Booking code: `fmw7y2qc`
