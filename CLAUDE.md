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
SaaS rakaman temuduga profesional untuk Malaysia. AI transcribe + analisa perbualan secara real-time.

**Pengguna:** Kaunselor, Polis, SPRM/MACC, Doktor, Juruaudit ISO, Penyiasat HR, Mahkamah, Peguam, Pegawai JKM (9 profesion)

## Tech Stack
- React + Vite (JSX, bukan TypeScript)
- Tailwind CSS v3
- Supabase (auth + database)
- AssemblyAI `universal-3-pro` (speaker diarization, batch, on session end) via `/api/transcribe?mode=diarize`
- OpenAI Whisper `whisper-1` (real-time chunk transcription during recording) via `/api/transcribe`
- Anthropic Claude `claude-opus-4-7` (AI analysis) via `/api/suggest`
- Google Gemini `gemini-2.5-flash` (fallback untuk Claude 529/500) via `/api/suggest`
- Stripe (payments)
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
    whisper.js          — diarizeAudio(), pollDiarization(), createWhisperClient()
  lib/                  — Supabase, IndexedDB, crypto, sync
  store/                — Zustand state (auth, billing)
  pages/                — Route pages (SessionPage.jsx — diarization on session end)
  components/           — UI components
api/                    — Vercel serverless functions (Node.js ESM) — MAX 12 (Hobby plan)
  suggest.js            — Anthropic Claude + Gemini fallback AI analysis
  transcribe.js         — AssemblyAI diarize (POST mode=diarize, GET ?job_id) + Whisper realtime
  report.js             — Generate report + SHA-256 hash
  gemini.js             — Gemini AI endpoint
  stripe-billing.js     — Merged: invoice list (GET) + portal session (POST)
  stripe-checkout.js, stripe-webhook.js
  admin.js, cron-reset-usage.js, share-session.js, team-invite.js, user-notifications.js
supabase/               — SQL schema + seed
```

## Counselor Module
- Public booking: `/book/:booking_code` → `PublicBookingPage.jsx`
- Kaunselor pages: `/kaunselor/setup`, `/kaunselor/appointments`, `/kaunselor/clients`, `/kaunselor/clients/:id`
- API: `src/api/counselor.js` — all counselor CRUD
- 3 Supabase RPCs: `get_counselor_by_booking_code`, `get_booked_times`, `submit_appointment`
- Email notifications in `api/user-notifications.js`: `type=new-appointment` (public) + `type=appointment-confirmed`
- `appointment_slots` dan `appointments` guna `counselor_id` (bukan `user_id`)
- `counselor_profiles.booking_code` = QR token (unique, 8-char alphanumeric)
- Risk level 3-tier: `none` / `mental_health` / `self_harm` / `suicidal` (stored in `subjects.risk_level`)
- Action plans: `action_plans` table (goals jsonb array, interventions jsonb array)
- Clinical referrals: `clinical_referrals` table (referral_type: psychiatry/hospital/social_welfare/ngo/other)

**SOP Counselling Unit (2026-05-29):**
- Intake Form: marital_status, race, religion, previous_counseling, psychiatric_history, psychiatric_medication, session_type, hostel_resident, problem_types (12 kategori)
- 12 Problem Types: Emosional, Perhubungan Sosial, Pembangunan Kerjaya, Keluarga/Rumah, Akademik, Kewangan, Agama, Seksual, Undang-undang, Kesihatan, Tabiat/Sikap, Krisis
- Case Session Note dalam AI report: presentedIssue, identifiedIssue, mutualGoal, activitiesInterventions, progressGoalAchievement, followUpPlan, terminationNotes
- Informed Consent: teks legal SOP penuh (Akta Kaunselor 1998 + PDPA)
- crisisIndicators: riskType field (none/mental_health/self_harm/suicidal)
- subject_info dihantar ke report API dari SessionPage

**Assessment Tools (2026-05-29):**
- `AssessmentPanel.jsx` — tab dalam sesi, MBTI (16 soalan BM) + RIASEC (24 aktiviti Holland Code)
- Auto-score: MBTI → 4-letter type, RIASEC → 3-letter Holland code
- Hasil simpan ke `session_assessments` table
- `assessment_sets` seeded dengan 2 default sets (user_id = NULL = system default)
- Audio Library tab dibuang dari Sidebar — audio embed dalam client file Sessions tab
- Audio signed URL dari Supabase Storage (1hr expiry) per session

## Hobby Plan — 12 Serverless Functions (HARD LIMIT)
Jangan tambah function baru tanpa remove/merge yang lain dulu.
Semasa: admin, cron-reset-usage, gemini, report, share-session, stripe-billing, stripe-checkout, stripe-webhook, suggest, team-invite, transcribe, user-notifications

## AI Models
| Provider    | Model                         | Kegunaan                              |
|-------------|-------------------------------|---------------------------------------|
| Anthropic   | claude-opus-4-7               | AI analysis (suggest)                 |
| AssemblyAI  | universal-3-pro / universal-2 | Speaker diarization (batch, on end)   |
| OpenAI      | whisper-1                     | Real-time chunk transcription         |
| Gemini      | gemini-2.5-flash              | Ready, belum digunakan                |

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
| Plan       | Sesi/bulan | Harga/bulan | Topup tersedia |
|------------|------------|-------------|----------------|
| Percuma    | 2          | RM0         | Tidak          |
| Kaunselor  | 10         | RM100       | Ya             |
| Starter    | 20         | RM249       | Tidak          |
| Pro        | 100        | RM999       | Tidak          |
| Perniagaan | 200        | RM2,499     | Tidak          |

**Kaunselor Top-up:**
- 1 sesi: RM13 (one-time Stripe payment)
- 5 sesi: RM60 (RM12/sesi)
- 10 sesi: RM100 (RM10/sesi)
- Top-up disimpan dalam `subscriptions.extra_sessions` — tidak luput, tidak reset bulanan
- Webhook `checkout.session.completed` + metadata `topup_sessions` → RPC `add_extra_sessions(uid, n)`
- `increment_sessions` RPC: semak extra_sessions bila sessions_used >= sessions_limit

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
STRIPE_PRICE_* (11 price IDs: starter/pro/biz monthly+annual, counselor monthly+annual, topup 1/5/10)
```

## Deployment
```bash
# Manual production deploy:
vercel deploy --prod --force --scope syedshazni-7682s-projects
```
- URL: https://www.verirec.app (+ https://verirec.vercel.app)
- Counselor subdomain: https://counselor.verirec.app
- Project ID: `prj_EwnDU0nKMOn56auUR1WZF1GeNI3f`
- Last deployed: 2026-05-30
- **PENTING:** appointments↔subjects ada 2 FK — query mesti guna `subjects!appointments_subject_id_fkey`
- Anon key pernah regenerate — jika data kosong, check VITE_SUPABASE_ANON_KEY dalam Vercel

## Counselor Subdomain (counselor.verirec.app)
- `src/lib/subdomain.js` — `isCounselorSubdomain()` detect hostname `counselor.verirec.app`
- `src/pages/CounselorLandingPage.jsx` — landing page dedicated, green/emerald theme, 6 features kaunselor, pricing RM100
- `App.jsx HomeRoute` — jika subdomain counselor: tunjuk CounselorLandingPage; jika user dah login → redirect `/kaunselor/clients`
- `AuthPage.jsx` — jika subdomain counselor: logo hijau, subtitle "Portal Kaunselor", force `preferred_profession=counselor` dalam localStorage, redirect post-login ke `/kaunselor/clients`
- DNS: CNAME `counselor` → `b36844232da1d730.vercel-dns-017.com.` dalam Namecheap ✅
- Vercel domain ditambah via `vercel domains add counselor.verirec.app` ✅

## Counselor Module — Full Feature List (2026-05-29)
- Navigation: Sidebar/BottomNav split by profession — kaunselor→Klien+Temujanji, others→Subjek+Fail Kes
- Detection: `localStorage.getItem('preferred_profession') === 'counselor'`
- Booking form: nama, IC, No. Matrik/Staff ID (student_id), telefon, email, DOB, gender, alamat, isu
- RPC `submit_appointment`: populate subjects dengan semua fields dari booking termasuk student_id
- Selepas confirm → auto-navigate ke /kaunselor/clients/:subject_id + butang "Buka Profil"
- KaunslorAppointmentsPage: 4 tabs — Permintaan | Jadual | Slot Masa | QR & Pautan
- Tab Jadual: scheduled_sessions CRUD, highlight hari ini, mark selesai
- Client file tabs: Maklumat | Sesi | Kalendar | Kebenaran | Plan | Rujukan | Temujanji
- Kalendar: monthly grid, biru=sesi, hijau=temujanji, click day→detail
- Audio embedded dalam Sesi tab (signed URL 1hr, Supabase Storage)
- PDF Case Session Note: jsPDF SOP format, counselor only (printCaseNote())
- Custom Assessment: tab dalam /templat, create soalan+pilihan, auto-available AssessmentPanel
- Email bug fix: type+appointment_id hantar sebagai URL query params (bukan body) — req.body tidak diparsed
  - new-appointment: ?type=new-appointment&appointment_id=...
  - appointment-confirmed: ?type=appointment-confirmed&appointment_id=...

**Reschedule (2026-05-29):**
- Confirmed appointments ada butang "Jadual Semula"
- Modal: tarikh asal → tarikh+masa baru + sebab
- Status jadi 'rescheduled', email ke klien auto (subject berbeza dari confirm)
- `appointmentConfirmedEmail(counselorName, date, time, duration, isReschedule)` — isReschedule=true tukar subject+header

## SOP Flowchart Compliance (2026-05-30) — 10/10 ✅
| Step | Feature | Status |
|------|---------|--------|
| 1. Walk-in/Appointment | `/book/:booking_code` + session setup walk-in | ✅ |
| 2. Fill up Intake Form | Booking form fields + Maklumat tab edit + **📋 Print Intake (CIF)** + walk-in warning | ✅ |
| 3. Attending client | Session setup + recording + AI real-time | ✅ |
| 4. Informed consent | ConsentPage + booking consent + Tab Kebenaran + print | ✅ |
| 5. Counselling process | Session recording, transcript, AI analysis, AssessmentPanel | ✅ |
| 6. Follow up | Action plans, scheduled sessions, follow_up_date | ✅ |
| 7. Extra Professional Help | Tab Rujukan + **🖨 Jana Memo PDF** rasmi | ✅ |
| 8. Termination | `terminationNotes` dalam Case Session Note (AI) | ✅ |
| 9. Counseling case report | Case Session Note PDF (jsPDF SOP) + AI report multi-page | ✅ |
| 10. File the Document | KaunslorClientFilePage — 7 tabs semua rekod | ✅ |

**Print Intake (CIF):** Butang dalam tab Maklumat → Borang Intake Kaunseling format SOP penuh (nama, IC, DOB, bangsa, agama, status, tahun, alamat, kecemasan, sejarah klinikal, tandatangan)
**Jana Memo:** Butang pada setiap rujukan dalam tab Rujukan → Memo Bantuan Profesional Tambahan (header UTM, butiran klien, sebab, tindakan, tandatangan kaunselor + penerima)
**Walk-in warning:** Jika IC+DOB kosong → banner "Borang Intake Tidak Lengkap" dengan butang "Lengkapkan"

## Fixes Penting (2026-05-30)
- `SignatureSection` hidden untuk counselor — consent dah ada dalam booking, tidak perlu sign semula dalam report
- `exportPDF` full transcript: `pdfCapturing=true` → `TranscriptScript forceExpand` → 150ms wait → html2canvas → multi-page loop
- "Cetak" button dibuang dari report — redundant, guna "Eksport PDF" sahaja
- `AnnotationSection` ("Nota Kaunselor"): dari localStorage → DB `sessions.counselor_notes` column
- Assessment results → AI report: `caseSessionNote.assessmentFindings` dalam ReportView UI + PDF
- Appointment auto-complete: `.lte('confirmed_date', today)` filter — prevent mark future appointments
- Tab Kebenaran: butiran klien penuh (IC, matrik, jantina) + 🖨 Cetak consent form
- Tab Temujanji: badge completed = biru, papar confirmed_date bukan requested_date
- Reschedule: appointment masa depan tunjuk dalam "Akan Datang" bukan "Lepas"
- Reschedule card: badge biru, sebab jadual semula visible dalam kotak kuning
- Email reschedule: redesign dengan icon centered, table layout, warna adaptive, sebab reschedule dari counselor_notes
- `appointmentConfirmedEmail` terima param `rescheduleReason` — pass dari user-notifications.js
- **GOTCHA**: `user-notifications.js` select query mesti include `counselor_notes` — kalau tertinggal, reason tak keluar dalam email

## Test Account
- URL: `counselor.verirec.app`
- Email: `test.kaunselor@verirec.app` | Password: `Test1234!`
- Plan: Counselor (10 sesi) | Booking code: `fmw7y2qc`
- 3 klien dummy dengan 6 sesi, laporan AI, assessments, appointments, team

## Production Readiness Roadmap

### 🔴 Kritikal (sebelum launch sebenar)
| Item | Status |
|------|--------|
| Stripe live mode — topup berjaya, webhook crypto verify, billing portal via fetch | ✅ 2026-05-31 |
| Payment success modal + sejarah pembayaran + resit per transaksi | ✅ 2026-05-31 |
| Rate limit `/book/:booking_code` — RPC max 30/jam + honeypot + 5s load check | ✅ 2026-05-31 |
| Error boundary React — `ErrorBoundary.jsx` wrap App dalam `main.jsx` | ✅ 2026-05-31 |
| Stripe webhook URL: update ke `https://www.verirec.app/api/stripe-webhook` | ⏳ Manual |

### 🟠 Penting
| Item | Status |
|------|--------|
| Free trial 14 hari — `stripe-checkout.js` `trial_period_days: 14` semua plans | ✅ 2026-05-31 |
| Onboarding redirect ke `/kaunselor/setup` selepas signup | ✅ verified |
| Pricing: 10 → 20 sesi/bulan (config, webhook, PricingPage, CounselorLanding, DB) | ✅ 2026-05-31 |
| Demo interaktif 4-tab di landing page (`DemoWalkthrough.jsx`) | ✅ 2026-05-31 |
| SEO meta tags — og:*, twitter:card, JSON-LD, og-counselor.svg, sitemap, robots | ✅ 2026-05-31 |

### 🟡 Sederhana
| Item | Status |
|------|--------|
| jsPDF text-based — ganti html2canvas, exportPDF sepenuhnya text-based | ✅ 2026-05-31 |
| Bulk export data klien — CSV 14 kolumn dalam KaunslorClientsPage | ✅ 2026-05-31 |
| Walk-in + booking unified flow — startNewSession → /session/setup/counselor | ✅ 2026-05-31 |
| Mobile SessionPage redesign — 4-tab icons, AI+Assessment sub-toggle, compact bar | ✅ 2026-05-31 |

### Stripe Live Mode Steps
1. Stripe dashboard → Live Mode → buat products sama
2. Update 5 env vars Vercel: `STRIPE_PRICE_COUNSELOR_MONTHLY/ANNUAL`, `STRIPE_PRICE_TOPUP_1/5/10`
3. Update `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` ke live keys
4. Update webhook endpoint: `https://www.verirec.app/api/stripe-webhook`

### ⚠️ GOTCHA KRITIKAL — Stripe + Vercel

**1. PowerShell echo menambah BOM pada env vars**
Jangan guna `echo "value" | vercel env add ...` — menambah BOM (U+FEFF) yang rosak API calls.
Cara betul:
```powershell
$val = "sk_live_..."
[System.IO.File]::WriteAllText("$env:TEMP\ev.txt", $val, [System.Text.UTF8Encoding]::new($false))
Get-Content "$env:TEMP\ev.txt" | vercel env add VAR_NAME production --scope ...
Remove-Item "$env:TEMP\ev.txt"
```
Dalam code, guna `clean()` helper: `const clean = (v) => (v || '').replace(/^﻿/, '').trim()`

**2. Stripe SDK v22 tidak compatible dengan Vercel ESM**
Jangan guna `new Stripe(key)` SDK — menyebabkan "An error occurred with our connection to Stripe".
Guna `fetch` terus ke `https://api.stripe.com/v1/...` dengan Authorization header.
Bila encode params, `encodeURIComponent()` pada VALUES sahaja — bukan KEYS (keys ada literal `[]`).

**3. Stripe checkout success/cancel URL mesti guna origin dari request**
Jangan hardcode `VITE_APP_URL` — counselor.verirec.app dan www.verirec.app ada session berasingan.
Frontend hantar `window.location.origin`, server guna sebagai base URL.

## Email Domain (verirec.app)
- Domain `verirec.app` dah tambah dalam Resend (ID: `0d836d3d-fddd-4462-b390-736bd1ebc8e4`, region Tokyo)
- FROM: `noreply@verirec.app` dalam `api/_mailer.js`
- `RESEND_API_KEY` dah set dalam Vercel production
- DNS records dah tambah dalam Namecheap: DKIM, MX, SPF, DMARC — **Verified ✅**
