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

Pengesan subdomain via `src/lib/subdomain.js` — hanya `isCounselorSubdomain()`.
`doctor.verirec.app` dan `jkm.verirec.app` dah **ditarik balik** — redirect ke `www.verirec.app`.

**PENTING — Platform separation rules:**
- `isCounselorSubdomain()` adalah **satu-satunya** penentu counselor UI — **BUKAN** `localStorage preferred_profession`
- `AnalyticsPage`: guna `isCounselorSubdomain()` untuk render CounselorDashboard, default `useCase='soal-siasat'` untuk www
- Route `/sessions` → DashboardPage dengan `pageTitle="Sesi Terkini"` (tanpa redirect ke /analytics)
- `SessionSetupPage`: dropdown "Fail Kes" hanya pada www.verirec.app (`!isCounselorSubdomain()`), simpan `case_id` ke sessionStorage
- `ConsentPage`: masukkan `case_id` dari sessionStorage ke dalam session insert
- `Sidebar`, `BottomNav`, `App.jsx`, `DashboardPage`, `ProfessionSelectPage`, `QuestionTemplatesPage` semua guna `isCounselorSubdomain()`
- `www.verirec.app`: sesi counselor ditapis keluar, profesi counselor tidak muncul, tab kaunseling tersembunyi
- `/dashboard` redirect ke `/analytics` pada www — Sidebar "Papan Pemuka" link ke `/analytics`

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
    kaunselor/          — Counselor-specific pages
  components/
    layout/
      Sidebar.jsx       — isCounselorSubdomain() tentukan nav items
      BottomNav.jsx     — sama, "Utama" → /analytics untuk professional
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


## Features Baru (2026-06-01 — sesi terkini)

**Laporan Bulanan Professional (AnalyticsPage.jsx):**
- Butang "Laporan Bulanan" + `<input type="month">` dalam TopBar AnalyticsPage (www sahaja)
- `printMonthlyReport()` — jsPDF text-based, blue theme, SHA-256 ringkasan footer
- Kandungan: header pegawai, ringkasan sesi/laporan/tempoh, taburan risiko, senarai sesi bulan
- Footer: "SULIT — UNTUK KEGUNAAN RASMI SAHAJA" + tarikh + SHA-256

**Global Search dalam Sidebar.jsx (www sahaja):**
- Search box bawah logo — query sessions, cases, subjects via supabase langsung
- Max 5 results per kategori, dropdown dengan tab Sesi|Kes|Subjek
- Keyboard: Escape tutup, Enter navigate ke result pertama
- Debounce 280ms, exclude counselor sessions

**Subject Risk History (SubjectsPage.jsx, www sahaja):**
- Butang "Sejarah" per subjek → `SubjectHistoryModal`
- Fetch sesi via `subject_id` atau `subject_name`, tunjuk tarikh/tempoh/risiko badge
- `RiskTrend` component: ↑ (risiko naik, merah) ↓ (turun, hijau) → (stabil, kuning)

**Witness/Co-interviewer Tracking:**
- `SessionSetupPage.jsx`: field "Pegawai Hadir Lain" (textarea, www sahaja)
- `sessions.other_officers` column (text) — DB migration applied
- `ConsentPage.jsx`: simpan ke sessions table
- `ReportView.jsx`: tunjuk dalam header UI + PDF (baris Pegawai Hadir: ...)
- `saveHeader()`: update DB dengan `other_officers`

**Evidence File Attachments (CaseDetailPage.jsx):**
- Section "Lampiran Bukti" — upload PDF/JPG/PNG/DOCX/MP4, max 50MB
- `supabase.storage` bucket `evidence` — path `{user_id}/{case_id}/{filename}`
- RLS: user hanya CRUD fail sendiri
- Senarai fail: nama, saiz, tarikh, butang Muat Turun + Padam
- Upload: validate MIME type + saiz sebelum upload

**Session Comparison (DashboardPage.jsx):**
- Butang "Bandingkan" muncul bila tepat 2 sesi dipilih dalam select mode
- Modal 3-kolum side-by-side: Tarikh|Tempoh|Subjek|Risiko|Sentimen|Ringkasan|Penemuan|Cadangan
- Highlight risiko (merah=naik, hijau=turun), banner bila subjek berbeza
- `exportComparisonPDF()` — jsPDF landscape layout

**AI Summary Keseluruhan Kes (CaseDetailPage.jsx):**
- Butang "Jana Ringkasan Kes (AI)" — aktif bila ≥2 sesi ada laporan
- `suggest.js`: mode `case_summary` — prompt 4-perenggan BM, Claude+Gemini fallback
- Simpan ke `cases.ai_summary` DB column + localStorage fallback
- Papar sebelum senarai sesi dalam gradient card biru
- "Jana Semula" button bila summary sudah ada

**DB Migrations (2026-06-01):**
- `sessions.other_officers` text
- `cases.ai_summary` text
- `storage.buckets`: bucket `evidence` (50MB, PDF/JPG/PNG/DOCX/MP4)

**Deployment:** Commit `a789d0a` — deployed 2026-06-01

---

## Features Baru (2026-06-01 — sesi terkini)
**AssemblyAI Speaker Identification:**
- `api/transcribe.js` GET: selepas diarization selesai, call `llm-gateway.assemblyai.com/v1/understanding`
  - Pass `interviewer` + `subject_name` sebagai speakers dengan description
  - Mapping: `{ A: 'Ahmad Faris', B: 'Mohd Farid' }` → `identified_name` per utterance
  - Failure non-fatal — fallback ke diarization biasa (heuristic first speaker = interviewer)
- `src/api/whisper.js`: `pollDiarization()` terima `{ interviewer, subject_name }` → pass ke query params
- `src/pages/SessionPage.jsx`: pass `setup.interviewer` + `setup.subject_name` ke pollDiarization
  - Jika `hasIdentified`: map via name matching (bukan heuristic)
  - Simpan `identified_name` dalam transcript entries
- `TranscriptPanel.jsx`: tunjuk nama sebenar + badge "✓ ID" (hijau) bila disahkan
- `ReportView.jsx`: tunjuk nama sebenar dalam transkrip UI dan PDF export

## Features Baru (2026-06-01 — sesi sebelumnya)
**#13 Multi-language transcription:**
- `api/transcribe.js`: language-aware Whisper — 'auto'=no lang (BM+EN mix detect), 'ms'/'en' → explicit
- Prompt context Malaysia untuk setiap mod bahasa
- `src/api/whisper.js`: `createWhisperClient({ lang })` — send language field per chunk
- `src/hooks/useWhisper.js`: accept `lang` prop via langRef
- `SessionPage`: default 'auto', selector "Auto BM+EN (Campuran)" | BM | EN (MY) | EN (US)

**#15 Follow-up deadline notifications:**
- `ReportView FollowUpTracker`: deadline picker per item (hover reveal), badge overdue/mendesak
- `DashboardPage`: `getDeadlineAlerts()` — banner merah items tertunggak atau due ≤2 hari

**Case management 2.0:**
- `CaseDetailPage`: "Nota Bukti & Ulasan Kes" — textarea, simpan ke cases.description + localStorage
- `CaseDetailPage`: "Timeline Aktiviti Kes" — collapsible chronological timeline (kes cipta → sesi → tutup)

**PEACE Model auto-phase:**
- `SessionPage`: PEACE_THRESHOLDS_SEC [0, 3min, 8min, 25min, 45min]
- Auto-advance `currentPhase` bila timer.elapsed lepasi threshold (isInvestigationProf sahaja)
- Toast notifikasi "📍 Fasa: [nama]", tidak berulang per phase (autoPhaseRef tracking)

## Features Baru (2026-06-01 — sesi sebelumnya)
**Chain of Custody — Lebih Kuat:**
- `auditLog.js`: tambah `getSessionAuditLogs(sessionId)` — fetch audit events per sesi
- `ReportView.jsx`: Chain of Custody section dinaik taraf:
  - Document identity cards (ID sesi, dicipta, pengendali, platform)
  - Full SHA-256 hash + status badge "Dijana Pelayan"
  - Collapsible audit trail log — semua akses dengan timestamp
- `ReportView.jsx`: PDF export:
  - Footer watermark setiap halaman: "SULIT — [user_email] — [datetime]"
  - Halaman Chain of Custody penuh di akhir PDF (ID, hash, log akses 8 terbaru, print info)
  - Log 'report.export' setiap kali PDF dieksport
- `ReportView.jsx`: Audio `onPlay` → log 'audio.play' event
- `SessionReportPage.jsx`: log 'session.status', 'report.share', 'report.share.revoke', 'session.edit'

## Features Baru (2026-05-31 — sesi sebelumnya)
- `ConsentPage` + `DashboardPage`: `incrementUsage()` dipanggil selepas session insert — fix bug sessions_used tidak increment
- `SettingsPage`: section "Pengurusan Organisasi" untuk Pro/Biz plan — org name, team members, link ke /team
- `TeamPage`: org capacity banner — "X/5 tempat ahli · 100 sesi/ahli/bulan", warning bila had dicapai
- Mobile SessionPage (#10): SUDAH SIAP — 4 tabs + icons + min-h-52px + AI sub-toggle

## Features Baru (2026-05-31 — sesi sebelumnya)
- `AnalyticsPage`: welcome state untuk professional user baru (0 sesi), 3 langkah onboarding
- `Sidebar`: "Sesi Terkini" → `/sessions` (DashboardPage, sebelum "Sesi Baru")
- `professions.js`: SISPA (OSA 1972), SKMM (CMA 1998), JTK (Akta Kerja 1955) — lengkap dengan soalan BM
- `SessionSetupPage`: dropdown "Fail Kes" — link sesi ke kes semasa setup (www.verirec.app sahaja)
- `SessionReportPage`: butang "Semak Keaslian Dokumen" — verify SHA-256 hash server-side
- `api/report.js`: GET endpoint `?verify=true&session_id=` untuk hash verification
- `CaseDetailPage`: butang "📦 Eksport Kes" — jsPDF export semua sesi dalam kes
- `PricingPage`: plan "Organisasi" (RM999/bulan, 5 pengguna, 100 sesi/pengguna) ditambah

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
- Tab "VeriRec Profesional": Percuma + Profesional (RM100) + Organisasi (RM999, 5 pengguna) + Enterprise hubungi
- Tab "Kaunselor": Kaunselor (RM100) + top-up
- Pro/Biz ditunjuk sebagai "Organisasi" — Stripe price ID tidak diubah

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
- www.verirec.app + counselor.verirec.app (doctor/jkm redirect ke www)
- Project ID: `prj_EwnDU0nKMOn56auUR1WZF1GeNI3f`
- GitHub: `https://github.com/shaze22/verirec` (branch: main)
- Last deployed: 2026-06-01 (commit `bd9ecda` — AssemblyAI Speaker Identification)
- Supabase project ID: `sbakkkxuhkxfofpfhdtn`

**Supabase Auth URL Configuration (dashboard):**
- Site URL: `https://www.verirec.app`
- Redirect URLs: `https://www.verirec.app/**`, `https://counselor.verirec.app/**`

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

## Test Accounts

**Kaunselor (counselor.verirec.app):**
- Email: `test.kaunselor@verirec.app` | Password: `Test1234!`
- Plan: Counselor (10 sesi) | Booking code: `fmw7y2qc`

**Admin / Professional (www.verirec.app):**
- Email: `syedshazni@gmail.com` | Plan: Pro (100 sesi)
- Dummy data: 4 kes, 5 subjek, 5 sesi (SPRM/Polis/HR/ISO), 3 ahli pasukan, 4 templat
