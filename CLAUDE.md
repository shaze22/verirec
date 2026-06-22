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

## What is VeriRec?

**Two platforms, one codebase:**

| Platform | URL | Focus |
|----------|-----|-------|
| VeriRec Professional | www.verirec.app | Interview + audit — Police, MACC, HR, ISO, Halal JAKIM, Lawyers, Doctors, JKM etc |
| VeriRec Counselor | counselor.verirec.app / kaunselor.app | Counseling session management — client files, appointments, assessment |

Pengesan subdomain via `src/lib/subdomain.js` — hanya `isCounselorSubdomain()`.
`doctor.verirec.app` dan `jkm.verirec.app` dah **ditarik balik** — redirect ke `www.verirec.app`.

**PENTING — Platform separation rules:**
- `isCounselorSubdomain()` adalah **satu-satunya** penentu counselor UI — **BUKAN** `localStorage preferred_profession`
- `AnalyticsPage`: guna `isCounselorSubdomain()` untuk render CounselorDashboard, default `useCase='soal-siasat'` untuk www
- Route `/sessions` → DashboardPage dengan `pageTitle="Sesi Terkini"` (route kekal, tapi tiada link dalam nav)
- `SessionSetupPage`: dropdown "Fail Kes" hanya pada www.verirec.app (`!isCounselorSubdomain()`), simpan `case_id` ke sessionStorage
- `ConsentPage`: masukkan `case_id` dari sessionStorage ke dalam session insert
- `Sidebar`, `BottomNav`, `App.jsx`, `DashboardPage`, `QuestionTemplatesPage` semua guna `isCounselorSubdomain()`
- `ProfessionSelectPage` — RETIRED 2026-06-02. Replaced by inline selector in SessionSetupPage.
- `www.verirec.app`: sesi counselor ditapis keluar, profesi counselor tidak muncul, tab kaunseling tersembunyi
- `/dashboard` redirect ke `/analytics` pada www — Sidebar "Papan Pemuka" link ke `/analytics`

**Sesi Baru CTA styling fix (commit 67492a8, 2026-06-01):**
- `Sidebar.jsx`: CTA item guna `bg-blue-600/15 text-blue-400 border border-blue-500/25` — subtle tint, bukan solid biru
- Hover → solid biru. Jelas beza antara action button vs active page nav item.

**Sesi Baru dari Fail Kes (commit 229c7de, 2026-06-01 — updated c9e3e41):**
- `CaseDetailPage`: button "🎙 Sesi Baru" → `startNewSession()` simpan `case_prefill` ke sessionStorage → navigate `/session/setup`
- `SessionSetupPage`: baca `case_prefill` on mount → auto-isi `case_number`, `case_id`, auto-set profession
- Banner biru "Continued from Case File" tunjuk nama + no. kes

**Nav Structure — www.verirec.app:**
- Sidebar `OTHER_ITEMS`: New Session `/session/setup` (CTA biru) | Case Files | Schedule | Templates | Audit Log | Team | Settings
- BottomNav `OTHER_NAV`: Home | New Session `/session/setup` | Case Files | Settings
- SubjectsPage baca `?id=` URL param → auto-buka SubjectHistoryModal dari global search

**New Session Flow — unified (commit c9e3e41, 2026-06-02):**
- Route: `/session/setup` (tiada `:profession` param)
- `/session/new` dan `/session/setup/:profession` redirect ke `/session/setup` (backward compat)
- `SessionSetupPage`: profession selector grid atas form (2-3 col compact)
- Profession init priority: sessionStorage session_setup → case_prefill → localStorage preferred_profession → 'police'
- Tukar profession live: case label, witness label, subject label auto-update tanpa reset form
- `CASE_FIELDS` coverage: police, sprm, sispa, skmm, hr, jtk, iso, doctor, counselor, court, peguam, jkm (12 professions)
- `SchedulePage.handleStart()`: navigate `/session/setup` (profession dalam sessionStorage)
- `CaseDetailPage.startNewSession()`: navigate `/session/setup` (profession dalam case_prefill)

## Tech Stack
- React + Vite (JSX, bukan TypeScript)
- Tailwind CSS v3
- Supabase (auth + database)
- Google Gemini `gemini-2.5-flash` (diarization on session end + import transcription) via `/api/gemini?mode=diarize`
- OpenAI Whisper `whisper-1` (real-time chunk transcription during recording) via `/api/gemini`
- Anthropic Claude `claude-opus-4-7` (AI analysis) via `/api/suggest`
- Google Gemini `gemini-2.5-flash` (fallback untuk Claude 529/500) via `/api/suggest`
- Stripe (payments) — **Live mode aktif**, guna `fetch` terus (bukan SDK)
- Vercel (deployment)

## Landing UI helpers (Kaunselor, commit ed8b6c8)
- `src/components/ui/Reveal.jsx` — IntersectionObserver fade+slide-in wrapper. Props: `children`, `className`, `delay` (ms). Use to stagger card grids (`delay={i*90}`).
- `src/index.css` keyframes/utilities: `.animate-fade-up` (hero, set `animationDelay` inline to stagger), `.float-blob`/`.float-blob-2` (decorative glow orbs), `.text-shimmer` (violet→fuchsia animated gradient text). Guarded by `prefers-reduced-motion`.
- CounselorLandingPage design tokens: accent = **violet→fuchsia** gradient; dark hero/CTA = `bg-gray-950` + radial violet glow + faint grid pattern; cards = `ring-1 ring-gray-100` hover-lift; gradient icon tiles `from-violet-50 to-fuchsia-50 ring-1 ring-violet-100`; primary button `bg-gradient-to-r from-violet-600 to-fuchsia-600`. Keep violet identity — NOT the blue `brand` palette.

## Features Baru (2026-06-22 — Consent + Portal)

### 1. Pre-session Informed Consent (in-person, client-signed) — commits d0f8902, 2374de4
Counselor reads consent aloud; client signs digitally before a session starts. Episode-based (sign once) + per-session re-affirmation.

- **Flow / gate:** `KaunslorClientFilePage.startNewSession()` → `/kaunselor/clients/:id/upload-session` (`KaunslorUploadSessionPage`). The upload page now **gates** on consent before the session form: no active consent → render `<ConsentCeremony>`; active consent exists → quick re-affirm panel ("Client re-affirms — Continue") or "Sign a new consent". `gatePassed` state unlocks the form. The `sessions` insert records the real `consent_data` (`consent_id`, `hash`, `method`, `signed_at`) — NOT the old placeholder assertion.
- **Components/data:** `src/components/session/ConsentCeremony.jsx` (bilingual BM/EN toggle, per-clause checkboxes, reuses `src/components/session/SignaturePad.jsx` for drawn signature). Content in `src/data/consentDocument.js` (`CONSENT_VERSION`, `CONSENT_SECTIONS`, `CRISIS_RESOURCES`). Client API in `src/api/consent.js` (`getActiveConsent`, `getConsentDetail`, `sealConsent`, `reaffirmConsent`, `withdrawConsent`).
- **Server seal (SHA-256, per Rule 6):** `api/report.js` modes `mode=seal-consent` (verifies counselor owns subject, computes SHA-256 server-side, supersedes prior active, inserts row via service key) and `mode=reaffirm-consent`.
- **Tables (migration `20260622_client_consents.sql`):** `client_consents` (subject_id, signature_data base64 PNG, clauses jsonb, hash, status active|withdrawn|superseded, is_guardian/guardian_*) + `consent_reaffirmations`. RLS: counselor owns (`auth.uid()=user_id`); portal client may read own via `subjects.portal_user_id`.
- **Counselor management:** ClientFile **Overview** has an "Informed Consent" card → status, signer, date, re-affirm count, SHA-256, **View** modal / **Download PDF** / **Withdraw**. PDF receipt = `src/lib/consentPdf.js` (`downloadConsentPdf`, bilingual, jsPDF, includes clauses + signature image + seal + crisis resources).
- **Client portal self-sign (commit c3697c8):** the client can view, sign, and download their own copy of consent in the portal (`PortalHomePage` Consent tab + Overview nudge) on their phone/tablet. `seal-consent` authorizes EITHER the counselor (`subject.user_id`) OR the client (`subject.portal_user_id`); the row is always owned by the counselor (`user_id = subject.user_id`) and records `client_consents.signed_via` ('in_person' | 'portal'). Standard practice: both parties get a PDF copy (counselor via client file, client via portal).
- **Content meets global (APA/ACA/BACP, GDPR) + exceeds Malaysia (Act 580/LKM/PDPA):** limits-to-confidentiality (duty to warn, mandatory reporting, court order, supervision), recording & AI processing, cross-border data processing disclosure, rights, crisis lines, guardian consent. DO NOT alter clause text without review (legal).

### 2. Client Portal — Progress trends + realtime — commit f2c2963
Portal lives at `src/pages/portal/` (`/portal` login magic-link, `/portal/home` `PortalHomePage`). Already had assessments, homework, messages, resources, invoices, reschedule.

- **Your Progress:** Overview shows SVG trend charts of completed PHQ-9 / GAD-7 / DASS-21 (subscales) scores over time with improvement delta (lower score = better → green ↓). Component `src/components/portal/ScoreTrendChart.jsx` (pure SVG, stroke = `currentColor`, color via `className`).
- **Realtime messaging:** `PortalHomePage` subscribes to `portal_messages` INSERTs via `supabase.channel(...).on('postgres_changes', …)` (RLS-scoped). Live-appends messages, unread badge on Messages tab, browser Notification on counselor reply. Requires the table in the realtime publication — migration `20260622_portal_messages_realtime.sql` (`ALTER PUBLICATION supabase_realtime ADD TABLE portal_messages`).
- **Gotcha fixed:** dynamic `bg-${color}-50` summary cards don't survive Tailwind JIT — use static class strings (now gradient/ring cards). Never build Tailwind classes via template literals.
- **Portal nav (commit c3c541a):** replaced the horizontal overflow tab bar (which hid later tabs like Consent off-screen) with a desktop **side nav** (icons + active gradient) + mobile **dropdown**. `PortalHomePage` is now a `md:flex` layout: `<aside>` sidebar + `<main>`.
- **PWA reload prompt (commit 865ee55):** `vite.config.js` `registerType: 'prompt'` (was `autoUpdate`) + `src/components/ReloadPrompt.jsx` (`useRegisterSW` from `virtual:pwa-register/react`) mounted in `App.jsx` — shows a "New version available → Reload" banner so clients aren't stuck on a stale cached build. NOTE: a plain hard-refresh does NOT bypass the service worker; to force the current cached build to update once, unregister the SW / clear site data.

### 3. Professional Letterhead + auto-email consent — commit d49c1d0
Reusable letterhead/branding for ALL counselor documents (consent receipt, AI letters, future reports).
- **Profile (`counselor_profiles`):** existing fields (`display_name`, `credentials[]`, `registration_number` = LKM, `klinik_name`, `klinik_address`, `phone`) + new `logo_data`, `signature_data` (both **base64 data URLs** — Settings downscales images via canvas before save, no Storage bucket), `website`, `official_email`, `org_registration_no` (SSM/ROC). Migration `20260622_counselor_letterhead_fields.sql`.
- **Edit in Settings → Counselor Profile** (`SettingsPage.jsx`): logo + signature upload (`fileToCompressedDataUrl`), email/website/org-reg fields.
- **Shared renderer `src/lib/letterhead.js`:** `renderLetterhead(doc, profile)` (logo + org + name + credentials + LKM reg + divider, returns y), `renderLetterFooter` (contact line), `renderSignatureBlock` (signature image + name/creds/reg/date for letters). Used by `consentPdf.js` (replaced the violet band) and `letterPdf.js`.
- **Consent PDF** takes `profile` (passed from client file = counselor's own `getCounselorLetterhead(user.id)`; from portal = `getCounselorLetterhead(primary.user_id)`).
- **AI letters** (Generate Clinical Document modal): new "Download PDF (Letterhead)" → `downloadLetterPdf` (`src/lib/letterPdf.js`).
- **Auto-email with PDF attachment (commit 0e7fe9f):** `seal-consent` (api/report.js) generates the consent PDF **server-side** (jsPDF runs in Node — tested) via the shared `buildConsentDoc(doc, ...)` in `src/lib/consentPdfDoc.js` (also used by the browser `consentPdf.js`), on the counselor's letterhead, and attaches it to the client email. `sendEmail` now supports Resend `attachments: [{ filename, content(base64) }]`. Fire-and-forget; if PDF gen fails it still sends the link-only email. Server fetches the counselor letterhead via supabaseAdmin from `counselor_profiles`.
- Gotcha (caused a build fail): never put `await` inside a non-async inner arrow — `setProfileForm(fm => ({ ...fm, x: await f() }))` is a syntax error; await first, then setState.

## Peraturan Wajib
1. **Jangan panggil OpenAI/Anthropic/Stripe/Gemini dari browser** — semua melalui `/api/` routes
2. **Jangan simpan secrets dalam `src/`** — hanya `VITE_` prefix dibenarkan di frontend
3. **All UI text in English** — code comments in English. EXCEPTION: BM consent body text in KaunslorClientFilePage (legally required for Malaysian counseling regulation)
4. **Setiap async function perlu try/catch** — tiada silent failures
5. **Consent data mesti tidak pernah dipadam** — PDPA compliance, audit trail kekal
6. **SHA-256 hash dikira server-side** dalam `api/report.js` — bukan client-side
7. **Pricing in USD** — $0 free, $22/unlimited (pro). Counselor top-up $3/$12/$22. No RM in UI.
8. **Tiada free trial** — `trial_period_days` telah dibuang dari `stripe-checkout.js`

## Coding Standards (Wajib — Setiap Sesi)

### Error Handling
- **DILARANG: `.catch(() => {})` yang kosong** — selalu log atau tunjuk error kepada user
- **WAJIB: try/catch untuk semua API calls** — dengan `toast.error()` yang informatif
- **WAJIB: check error return dari Supabase** — `const { data, error } = await ...; if (error) throw error;`
- **DILARANG: silent DB saves** — `await supabase.from(...).update(...)` mesti check error
- **Fire-and-forget (email, analytics)**: boleh guna `.catch(err => console.error(...))` — log tapi tak crash

### Mesej Error kepada User
- Tunjuk **sebab spesifik** bukan "Something went wrong"
- Contoh baik: `"AI analysis failed. Your transcript is saved. Please retry."`
- Contoh baik: `"Auto-save is failing. Check your internet connection."`
- Guna `toast.error()` untuk transient errors, inline error text untuk payment/critical flows

### Supabase Queries
- **Guna `.maybeSingle()` bukan `.single()`** bila data mungkin tiada (`.single()` throws bila kosong)
- **Guna specific columns** bukan `.select('*')` untuk queries yang besar
- **Tambah `.limit(N)`** pada semua queries yang boleh return banyak rows — kecuali ada justifikasi
- **Guna `.in('id', ids)`** bukan multiple `.eq()` calls untuk multi-record queries

### AI Fallback Order
- **Claude dulu, Gemini fallback** — bukan sebaliknya
- Pattern standard:
  ```js
  try {
    const msg = await anthropic.messages.create({...});
    text = msg.content[0].text.trim();
  } catch (err) {
    if (err?.status !== 529 && err?.status < 500) throw err; // non-retryable
    text = await callGeminiFallback(prompt); // only on 5xx/529
    provider = 'gemini';
  }
  ```

### State & Loading
- **Setiap async action perlu loading state** — user mesti tahu sesuatu sedang berlaku
- **Jangan guna lazy-load + ref guard** untuk data yang boleh berubah — guna eager load + refresh button

### Scaling
- **Pagination wajib** untuk lists yang boleh melebihi 50 rows
- **Database indexes** — tambah index bila query filter by `user_id`, `counselor_id`, atau `subject_id`
- **Rate limits sebagai env vars** — jangan hardcode dalam `_rateLimit.js`

## Struktur Projek
```
src/
  api/                  — Frontend API clients (call /api/ routes)
  lib/                  — Supabase, IndexedDB, crypto, sync, subdomain, profConfig
  store/                — Zustand state (auth, billing)
  pages/
    LandingPage.jsx     — www.verirec.app (Soro-inspired redesign 2026-06-02: white bg, font-black, comparison table, mobile PWA section)
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

## Features (2026-06-02)

**Close Case Guided Flow (CaseDetailPage.jsx — commit f989dae):**
- "🔒 Close Case" button replaces "Closed" option in status dropdown
- 3-step modal: Step 1 Review (sessions, reports, AI summary) → Step 2 Export (one-click PDF) → Step 3 Closing remarks + confirm
- Closing remarks saved to `cases.description` with `[Closing Remarks — date]` prefix
- Status `closed` set on confirm. "Reopen Case" button shown when case is already closed

**In-App Notification Centre (TopBar — commit 48fd042):**
- `src/components/layout/NotificationBell.jsx` — bell icon with red badge in TopBar
- Pulls follow-up deadline alerts (overdue + due ≤2 days) from localStorage session data
- Pulls pending appointment requests from Supabase for counselor subdomain
- Click notification → navigate to relevant page
- Auto-refresh on open

**kaunselor.app domain (2026-06-01):**
- Added to Vercel project, A record `76.76.21.21` in Namecheap
- `isCounselorSubdomain()` updated to recognise `kaunselor.app` + `www.kaunselor.app`

**Full English UI + Violet Counselor Theme (2026-06-01 — commit b5e54a7):**
- All 44 UI files translated BM → English
- Counselor theme: emerald `#10b981` → violet `#8b5cf6`, all `emerald-` → `violet-`
- Sidebar active item violet on counselor subdomain, subtitle "Counselor Platform"
- CLAUDE.md rule: "All UI text in English"

**Admin account kaunselor.app (2026-06-02):**
- Email: `admin@kaunselor.app` / Password: `Kaunselor@Admin2026!`
- Counselor plan (9999 session limit), counselor_profile created in Supabase

**Telegram Bot Token (2026-06-02):**
- `TELEGRAM_BOT_TOKEN` set in Vercel production
- Token: via @BotFather (do NOT store token here — it's in Vercel env)
- Setup in Settings → Telegram Notification → enter Chat ID (get from @userinfobot) → toggle ON

**Jadual Sesi fix (SchedulePage.jsx — commit 4c17c23):**
- All BM text → English (labels, toasts, badges, empty states)
- `isCounselor`: `localStorage` → `isCounselorSubdomain()`
- `handleStart` prefill: `location.state` (broken) → `sessionStorage 'session_setup'` so SessionSetupPage actually reads it
- `formatDistanceToNow`: removed `ms` locale → English
- STATUS_CONFIG: 'Dibatalkan' → 'Cancelled'

**Quick fixes (commits 544991b + 28c2c2d — 2026-06-02):**
- TermsPage.jsx: full English (all 12 sections)
- PrivacyPage.jsx: verified English
- AdminPage.jsx: removed `date-fns/locale ms`, all timestamps in English
- sitemap.xml: added kaunselor.app URLs (/, /pricing, /auth)
- SettingsPage.jsx: 'Langganan & Penggunaan'→'Subscription & Usage', 'Privasi & Data'→'Privacy & Data', 'Eksport JSON'→'Export JSON', 'Nyahaktifkan'→'Deactivate'

**OfflineBanner fix (commit 8842bc4 — 2026-06-02):**
- Root cause: `wasOffline` stays `true` for entire session — banner never dismissed
- Fix: removed `isOnline && wasOffline` condition, only `showRestored` (auto-dismiss 3s) shows green banner
- BM strings translated to English

**kaunselor.app Landing Page Redesign (commit 45cf253 — 2026-06-02):**
- Brand: 'VeriRec for Counselors' → 'Kaunselor' (standalone, no VeriRec prefix)
- Design: dark gray-950 hero, violet radial glow, Soro-inspired premium aesthetic
- Headline: 'Less Admin. More Counseling.'
- Interactive demo (4 tabs): Client Books → Session Runs → AI Report → Dashboard
- Features: emoji icon cards with hover effects
- Steps: 3-step numbered flow
- Trust: PDPA + Counselors Act + SHA-256 section
- Footer: 'Kaunselor' brand, dark black bg
- SEO: canonical updated to kaunselor.app

**Auth + Logout redesign for kaunselor.app (commit 179a62f — 2026-06-02):**
- AuthPage counselor: split layout — dark left panel (Kaunselor brand + 3 features) + white right form panel
- AuthPage heading: 'Kaunselor Portal', bg-gray-950 matching landing page
- AuthPage non-counselor: unchanged VeriRec blue styling
- LogoutPage: detects isCounselorSubdomain() — violet theme, 'Kaunselor' brand, dark bg
- No 'VeriRec' references on kaunselor.app auth/logout pages

**Sidebar Kaunselor branding (commit 9eec1c8 — 2026-06-02):**
- Logo: violet #8b5cf6 for counselor, blue #2563eb for www
- Brand name: 'Kaunselor' for counselor subdomain, 'VeriRec' for www
- Subtitle: 'Kaunselor Platform' (violet text) for counselor, 'Professional Platform' (gray) for www
- Header bg: subtle violet-950/30 tint + violet border for counselor

**PWA Kaunselor icon + manifest (commit ff6ffc0 — 2026-06-02):**
- `public/pwa-192-kaunselor.svg` + `public/pwa-512-kaunselor.svg` — violet #8b5cf6 icons
- `public/manifest-kaunselor.webmanifest` — name='Kaunselor', short_name='Kaunselor', theme_color='#8b5cf6'
- `vercel.json`: rewrite /manifest.webmanifest → /manifest-kaunselor.webmanifest when host is kaunselor.app or www.kaunselor.app
- User must reinstall PWA to see new icon/name

**Landing page updates (commit 7320cad — 2026-06-02):**
- Demo tabs reordered to match app sidebar: Dashboard → Appointments → Session → Report
- DemoBooking (client view) → DemoAppointments (counselor view) with 3 sub-tabs: Requests | Upcoming | QR & Link
- Mobile App section added: phone mockup, Android + iPhone PWA install steps

**UI Polish — 3 pages (commit 08b1e35 — 2026-06-02):**
- PublicBookingPage: dark gray-950 header with Kaunselor brand, white card body, premium loading/error/success screens
- KaunslorClientsPage: card grid (2-col desktop), risk-colored avatars, presenting_issue shown, better empty state, focus rings violet
- CounselorDashboard: appointment/session lists with avatar circles + hover, RISK_CONFIG English, PDF 'Dijana'→'Generated'

**UI Polish — Appointments, ClientFile, Session (commit a36ed08 — 2026-06-02):**
- KaunslorAppointmentsPage: all blue→violet, pending cards with avatar+amber badge, upcoming with avatar, better empty state
- KaunslorClientFilePage: tabs violet, summary cards violet/blue, risk selector violet
- SessionPage: mobile tab bar active indicator blue→violet

**Favicon + title fix (commit 477d59e — 2026-06-02):**
- public/favicon-kaunselor.svg: violet #8b5cf6
- vercel.json: rewrite /favicon.svg → /favicon-kaunselor.svg for kaunselor.app + www.kaunselor.app
- CounselorLandingPage title: 'Kaunselor — Digital Counselling Platform'

**Favicon Helmet fix (commit 245772f — 2026-06-02):**
- App.jsx: import Helmet, inject `<link rel="icon" href="/favicon-kaunselor.svg">` when isCounselorSubdomain()
- Vercel static file rewrites cannot override favicon — must use react-helmet-async
- Also sets apple-touch-icon to pwa-192-kaunselor.svg for counselor

**USD Pricing + Testimonials + Onboarding + Email Redesign (commit e6665cf — 2026-06-02):**
- Pricing: RM100 → $25 USD/month. Top-up: $3/$12/$22. "Pay any currency via Stripe"
- Testimonials: 3 counselor reviews with 5-star ratings on landing page
- OnboardingModal: counselor-specific 4 steps (Welcome→Profile→Slots→Session), violet theme, English
- _mailer.js: new kaunsBase() violet template, FROM_KAUNSELOR sender, all emails English
- Appointment emails: sent from 'Kaunselor <noreply@verirec.app>' with violet header
- ✅ Stripe products renamed to English, USD prices created, STRIPE_PRICE_* env vars updated (2026-06-02)
- ✅ App.jsx Helmet: title "Kaunselor — Digital Counselling Platform" for counselor subdomain (2026-06-02)
- ✅ Landing page badge global messaging, footer: FAQ · Privacy · Terms (2026-06-02)
- ✅ Privacy, Terms, FAQ pages: subdomain-aware — Kaunselor branding on kaunselor.app (2026-06-02)
- ✅ Landing CTA: "Get Started Free" (no trial), KaunslorSetupPage: Kaunselor brand + booking URL (2026-06-02)
- ✅ Supabase Auth redirect URLs: kaunselor.app + www.kaunselor.app added (2026-06-02)
- ✅ Stripe secret key rotated + updated in Vercel (2026-06-02)
- ✅ All remaining VeriRec refs in counselor pages replaced: print footers, notifications, QR popup, PDF, robots.txt (commit 271217b)
- ✅ FROM_KAUNSELOR: noreply@kaunselor.app (commit c8a7098)
- ✅ Resend domain kaunselor.app: VERIFIED (2026-06-08) — noreply@kaunselor.app fully active

**Recording Import — Client File (KaunslorClientFilePage.jsx — 2026-06-03):**
- New "Recordings" tab in client file — upload audio/video directly to client record
- Drag-and-drop or click-to-browse — accepts MP3, M4A, WAV, MP4, MOV, WebM, etc., max 500MB
- Uploads directly from browser → Supabase `recordings` bucket, path `{user_id}/clients/{subject_id}/{timestamp}_{filename}`
- Saved to `audio_library` table with `subject_id`, `session_id = null` (standalone, not tied to a session)
- Video MIME type → `<video>` element; audio → `<audio>` element for playback
- Delete button: removes from storage + audio_library
- Existing session-linked audio continues to appear in Sessions tab (unchanged)
- Tab label shows live count: "Recordings (N)"

**Client File Tab Refactor (KaunslorClientFilePage.jsx — 2026-06-03):**
- Reduced from 9 tabs → 6 tabs: Overview | Sessions | Appointments | Plans | Notes | Recordings
- Calendar tab removed (global calendar page exists)
- Consent forms merged into Appointments tab (sub-section "Signed Consent Forms")
- Referrals merged into Plans tab (sub-section "Referrals")
- Tab bar uses `grid grid-cols-6` — perfectly symmetrical, equal width, no overflow
- "Appointments" shortened to "Appts" in grid to fit cleanly
- New Session bug fixed: `navigate('/session/setup/counselor')` → `navigate('/session/consent')` — ProfessionalRoute was blocking /session/setup on counselor subdomain

**Latest deploy:** commit `aa8b7fc` — 2026-06-12 (client portal: account not found fix + portal sharing card)

---

## Features Baru (2026-06-12 — sesi terkini)

**Client Portal "Account Not Found" Fix (PortalHomePage.jsx):**
- Root cause: `maybeSingle()` returns null/error when client email matches multiple subjects (registered with different counselors)
- Fix: query order reversed — check `portal_user_id` first (returning users), then email fallback; use `.limit(1)` instead of `maybeSingle()` to safely handle multiple matches
- Supabase migration `fix_subjects_rls_auth_email`: replaced two broken RLS policies on `subjects` table that queried `auth.users` directly (causes "permission denied") with `auth.email()` built-in function
  - `client_read_own_subject`: `USING (portal_user_id = auth.uid() OR email = auth.email())`
  - `client_set_portal_user_id`: `USING (email = auth.email() AND portal_user_id IS NULL)`
- This migration also fixed: QR code missing, appointments not loading, client creation failing (all caused by the same RLS bug)

**Client Portal Access Card (KaunslorClientFilePage.jsx — Overview tab):**
- Added "Client Portal Access" card after summary cards, before risk level selector
- Shows client email (or amber warning if no email)
- Two action buttons: "Copy Link" (clipboard) + "Share via WhatsApp" (pre-filled WA message with portal URL + login email)
- Portal URL: `https://kaunselor.app/portal`

**Portal data not showing (assessments + appointments empty) — 3 bugs fixed (commit 121be25):**
- Bug 1: Wrong subject picked — `.limit(1)` without order picked subject with no data (client registered with 2 counselors). Fix: fetch ALL subjects with matching email, link ALL, query with `.in('subject_id', allIds)`
- Bug 2: UPDATE policy missing `WITH CHECK` — Postgres applies `USING` to both old AND new row. After setting `portal_user_id = user.id`, new row fails `portal_user_id IS NULL` → update silently rejected → RLS blocks data queries. Fix: migration `fix_subjects_portal_update_with_check` adds `WITH CHECK (portal_user_id = auth.uid())`
- Bug 3: `counselor_profiles` query changed from `.single()` → `.maybeSingle()` to avoid crash when no profile found
- GOTCHA: Postgres UPDATE RLS — always add explicit `WITH CHECK` when `USING` clause has a condition that the new row would violate (e.g. `IS NULL` check)

**Portal assessment results + count fix (commits 2a0d79a + ea024eb — 2026-06-12):**
- Assessment tab label used `pendingAsmt.length` — completed assessments counted as 0, client thought tab was empty. Fixed: use `assessments.length` (total)
- Completed assessments now show score + color-coded interpretation card (level, note, completed date). `interpretation` stored as JSON string — parse with try/catch
- Overview card: completed assessments show green "✓ Completed — view in Assessments tab" instead of nothing
- Supabase migration `fix_subjects_portal_update_with_check`: UPDATE policy missing WITH CHECK — Postgres applies USING to new row too, `portal_user_id IS NULL` fails after update → silently rejected → data queries return empty
- PortalHomePage: fetch ALL subjects with matching email; link portal_user_id on ALL; query data with `.in('subject_id', allIds)`
- GOTCHA: portal tab labels — always count ALL items, not just pending/active subset

**Portal messages + invoices + billing tab (commit 9b9d409 — 2026-06-12):**
- PortalHomePage: messages moved from lazy-load (messagesLoadedRef cached empty state) → eager load in linkAndLoad using `.in('subject_id', ids)`; Refresh button added
- PortalHomePage: invoices query changed from `eq('subject_id', primary.id)` → `.in('subject_id', ids)` for all subjects
- KaunslorClientFilePage: Billing tab added (sidebar + mobile select) — shows client invoices, "+ New Invoice" navigates to `/kaunselor/billing?client=<id>`
- KaunslorBillingPage: reads `?client=` URL param, pre-selects client + auto-opens create form
- GOTCHA: lazy-load + ref guard pattern (`messagesLoadedRef`) breaks when new data arrives after first empty load — prefer eager load + explicit refresh button

**Invoice Payment via Stripe — Client Portal (commits b314efe + cef1376 — 2026-06-12):**
- `api/stripe-checkout.js`: added `plan='invoice'` mode — one-time MYR Checkout session; params: `{ invoice_id, amount_cents (in sen = RM × 100), invoice_number, origin }`
  - Uses `payment_method_types[0]=card` (NOT `automatic_payment_methods` — auto mode returns Stripe 500 for MYR on non-Malaysian accounts)
  - Card type in Stripe Checkout automatically includes Google Pay + Apple Pay on supported devices
  - Adds `customer_email: user.email` for Stripe form prefill
  - No Stripe customer ID required — portal clients may not have subscription row
- `api/stripe-webhook.js`: `checkout.session.completed` checks `metadata.plan === 'invoice'` → marks `counselor_invoices.status = 'paid'` via service key
- `PortalHomePage.jsx`: Pay button calls `/api/stripe-checkout`; shows spinner; redirects to Stripe; on return `?payment=success` shows toast; inline error text shows below button if API fails (not just toast — toast dismisses too quickly)
- GOTCHA: `automatic_payment_methods[enabled]=true` with `currency=myr` causes Stripe 500 on non-Malaysian Stripe accounts — always use explicit `payment_method_types` for non-USD currencies
- FPX: NOT enabled (requires Malaysian business Stripe account) — card + Google Pay only

**Latest deploy:** commit `3551bd8` — 2026-06-13, deployment `dpl_AVZthC42BAXcxt2qRHPDDjCotwSG`

---

## Features Baru (2026-06-13 — sesi terkini)

**Informed Consent Form — Expanded (commits 3551bd8):**
- `PublicCounselorConsentPage.jsx`: expanded from 4 generic items → 7 full sections for legal validity
  1. Nature of Counseling Services
  2. Confidentiality (Malaysian Counselors Act 1998 / Act 580)
  3. Limits of Confidentiality (harm, abuse, court order, anonymised supervision)
  4. Session Documentation & AI Technology (AI transcription, encrypted storage, records access)
  5. Client Rights (ask questions, withdraw, referral, records access, LKM complaint)
  6. Personal Data Protection — PDPA 2010 (collection, use, retention, no third-party sharing)
  7. Voluntary Participation & Withdrawal
- Each section: full explanatory text + individual checkbox — client must tick all 7
- Progress bar: shows "X / 7 sections" live as client ticks
- Footer references Act 580 + PDPA 2010 for legal traceability
- `ConsentPage.jsx` (face-to-face pre-recording): expanded from 4 → 6 items covering AI transcription, limits of confidentiality, PDPA, client rights
- Both files use `Array(CONSENT_ITEMS.length).fill(false)` — no hardcoded array size

---

## Features Baru (2026-06-08 — sesi terkini)

**Landing Page Review Fixes (commit c27b53b — 2026-06-08):**
- Hero badge: SHA-256 removed → "Tamper-Proof Records · Privacy Compliant · 14 Professions · Trusted Worldwide"
- Hero desc, mockup caption, Step 03, pricing features: "SHA-256 hash/chain" → plain-language ("Tamper-proof", "cryptographically signed")
- Comparison table: competitors changed from Paper Notes/Basic Recorder → Zoom/Teams & Otter.ai (honest checkmarks)
- Testimonials: avatar initials with color circles, abbreviated last names, specific org names (no fictional orgs)
- Nav anchor + section id: `#profesion` → `#professions`
- FAQ (VeriRec): PDPA Malaysia → global, "Malaysian court rules" → jurisdiction-neutral, Business plan support line removed
- FAQ (Kaunselor): PDPA Malaysia → global, MBTI → Big Five/TIPI with full assessment list, $25→$22
- Contact form: `window.location.href = mailto:` → `window.open(..., '_blank')` (prevents navigating away)
- Schema JSON: price $25 → $22, product name "Professional" → "Unlimited"

**Global Branding Fixes (commits a6e537c, f44a92c — 2026-06-08):**
- LandingPage.jsx: badge "SHA-256 · Privacy Compliant · 11+ Professions · Globally Ready" (removed PDPA/Malaysia)
- Professions strip: SPRM/MACC→Anti-Corruption, SISPA→Private Investigator, MCMC removed, JTK→Labour Inspector, JAKIM Halal→Halal Inspector, JKM Officer→Welfare Officer
- WHO_FOR cards: same replacements + "PDPA-compliant" → "Privacy-compliant"
- Comparison table: "PDPA 2010 compliant" → "Privacy law compliant"
- Testimonials: removed DSP/En./Pn. honorifics, IPD Petaling Jaya → Criminal Investigation Division, removed "PDPA" from quote
- App mockup: "Ahmad bin Rosli · SPRM" → "J. Rivera · INV Case"
- ConsentPage.jsx: "PDPA 2010" → "applicable privacy laws"
- Meta description + schema.org: removed MACC/JAKIM references
- Pricing: $22/unlimited, "Two plans. No contracts." (LandingPage)

**Pre-Session Digital Consent (commit f41fec2 — 2026-06-08):**
- `src/pages/PublicConsentPage.jsx` — public page at `/consent/:token`
- From SchedulePage: "Send Consent Form" button → creates `consent_requests` record → opens WA with link
- Subject opens link, ticks 4 consent items, submits — `consented_at` timestamped in DB
- Supabase table: `consent_requests` (token, user_id, scheduled_session_id, session_id, subject_name, purpose, interviewer_name, consent_given, consented_at, expires_at 7 days)
- Public RLS: SELECT + UPDATE allowed (token-gated at app level)

**Statement Acknowledgement Portal (commit f41fec2 — 2026-06-08):**
- `src/pages/PublicStatementPage.jsx` — public page at `/statement/:token`
- From SessionReportPage: "Send to Subject" button (violet person icon) — only shown if transcript.length > 0
- Subject views transcript in chat-style UI + SHA-256 hash, can add corrections, then acknowledges
- `acknowledged_at` timestamped in DB, corrections stored
- Supabase table: `statement_acknowledgements` (token, user_id, session_id, subject_name, acknowledged, acknowledged_at, corrections, expires_at 30 days)
- Public RLS: SELECT + UPDATE allowed

**WA Reminders + Location from Schedule (commit f41fec2 — 2026-06-08):**
- SchedulePage card: "Send Reminder" (green WA button) → opens WA with session title/date/time/location
- SchedulePage card: "Send Consent Form" (blue button) → creates consent_request + opens WA with link
- SchedulePage modal: new "Location" field (stored in `scheduled_sessions.location`)
- `scheduled_sessions` table: `location TEXT` column added via migration

**Routes added (App.jsx):**
- `/consent/:token` → PublicConsentPage (lazy, public, no auth)
- `/statement/:token` → PublicStatementPage (lazy, public, no auth)

**kaunselor.app Phase 1 (commit 4e6364f — 2026-06-08):**
- WA Appointment Reminder + Consent Form buttons in Appointments tab
- `/counselor-consent/:token` — PublicCounselorConsentPage; `counselor_consent_requests` table (7-day expiry)
- `/counselor-ack/:token` — PublicCounselorAckPage; `counselor_session_acks` table (30-day expiry)
- Insights tab: AI Contradiction Detection across last 5 sessions (Gemini primary + Claude fallback)
- `api/suggest.js`: mode='contradiction' added; `src/api/claude.js`: analyseContradictions() added
- Routes: `/counselor-consent/:token` + `/counselor-ack/:token` added to App.jsx (lazy, public)

**kaunselor.app Phase 2 (commit 9a0c5e9 — 2026-06-08):**
- **Portal messaging**: `portal_messages` table; client ↔ counselor chat in both portal + client file (Messages tab)
- **Reschedule requests**: `reschedule_requests` table; client requests via portal; counselor handles in Appointments tab (amber banner)
- **Client self-serve payment**: `payment_url` in `counselor_profiles`; KaunslorSetupPage has payment link field; portal Invoices tab shows "Pay Now" button
- **Audit trail**: `kaunselor_audit_logs` table; logActivity() fire-and-forget; Overview tab shows last 8 entries
- **Insights v2**: contradiction detection now includes progress notes (SOAP/DAP/Free) + transcripts; threshold: 2+ sources; last 8 merged sources
- **Email system**: `RESEND_API_KEY` set in Vercel production (2026-06-08); kaunselor.app domain verified in Resend
- **DB migrations**: portal_messages, reschedule_requests, kaunselor_audit_logs, ALTER counselor_profiles ADD payment_url, portal RLS for counselor_invoices

**Generate Memo fix (commit `512d2a5` — 2026-06-03):**
- Regression from tab merge: "🖨 Memo" button was dropped from referral cards in Plans tab
- Restored full memo print handler — client info, referral type, reason, presenting issue, signature block
- Prints as styled HTML via `window.open` + `window.print()`

**Supabase Auth Redirect URLs (updated 2026-06-02):**
www.verirec.app/**, counselor.verirec.app/**, kaunselor.app/**, www.kaunselor.app/**

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
- `Sidebar`: nav distruktur semula — Sesi Terkini & Subjek dibuang dari utama (lihat "Nav Structure" di atas)
- `professions.js`: SISPA (OSA 1972), SKMM (CMA 1998), JTK (Akta Kerja 1955) — lengkap dengan soalan BM
- `SessionSetupPage`: dropdown "Fail Kes" — link sesi ke kes semasa setup (www.verirec.app sahaja)
- `SessionReportPage`: butang "Semak Keaslian Dokumen" — verify SHA-256 hash server-side
- `api/report.js`: GET endpoint `?verify=true&session_id=` untuk hash verification
- `CaseDetailPage`: butang "📦 Eksport Kes" — jsPDF export semua sesi dalam kes
- `PricingPage`: plan "Organisasi" (RM999/bulan, 5 pengguna, 100 sesi/pengguna) ditambah

## Features (2026-06-05 — commits 7a5f003 + bb80c18)

**Import Recording — credit gate (commit 7a5f003):**
- `ImportSessionPage.jsx`: added `canStartSession()` check upfront — blocks if limit reached before any DB write
- Fixed `incrementUsage()` — result was previously ignored; now throws on `limit_reached`
- `Sidebar.jsx`: "Import Recording" nav item added (upload icon, below "New Session") for www
- `DashboardPage.jsx`: "Import" button added to header action bar + "Or import an existing recording →" link in empty state

**Pricing change (commit bb80c18):**
- Professional + Counselor plan: 10 sessions → **5 sessions** at $25/month
- `src/config.js`, `api/stripe-webhook.js` `PLAN_LIMITS`, `PricingPage.jsx`, `LandingPage.jsx` all updated
- Per-session display: "$2.50/session" → "$5/session"
- Top-up callout: "Top-up at $3/session — cheaper than base rate"

## Performance (2026-06-05 — commit 87d6362)
- **Removed dead packages:** `html2canvas` (199kB) and `lamejs` (151kB) — were in package.json but never imported
- **html2canvas stubbed:** `src/stubs/html2canvas.js` → aliased in vite.config.js so jsPDF's optional `.html()` method doesn't pull in the full 199kB lib
- **PWA precache:** 2.2MB (86 entries) → **157kB (20 entries)** — removed all JS chunks from globPatterns; JS now uses StaleWhileRevalidate at runtime
- **Sentry deferred:** `main.jsx` uses `requestIdleCallback(() => import('@sentry/react'))` — no longer blocks initial render
- **QRCode lazy:** `KaunslorAppointmentsPage` static import → dynamic `import('qrcode')` inside useEffect

## Features Baru (2026-06-07 — Fasa 1 + Fasa 2)

**Fasa 1 — Upload-based Session Workflow:**
- `src/pages/kaunselor/KaunslorUploadSessionPage.jsx` (NEW) — `/kaunselor/clients/:id/upload-session`
- Replaces live browser recording for counselors (was unreliable)
- Two modes: "Upload Audio Recording" (MP3/M4A/WAV → Supabase → AssemblyAI diarize) and "Import Transcript (.txt)" (Plaud Note format)
- `.txt` parser: `/^([A-Za-z][A-Za-z\s]{0,25}):\s+(.+)/` detects "Speaker: text" lines
- Step progress UI: uploading → transcribing → generating → done
- `KaunslorClientFilePage`: `startNewSession()` now navigates to `/kaunselor/clients/:id/upload-session`
- Route added in `App.jsx`: protected, wrapped in AppLayout

**Fasa 2 — Psychology Assessment System:**
- `src/data/assessments.js` (NEW) — 5 test definitions, all public domain / free for clinical use:
  - PHQ-9 (9Q, depression severity, score 0-27)
  - GAD-7 (7Q, anxiety severity, score 0-21)
  - DASS-21 (21Q, depression+anxiety+stress, 3 subscales)
  - RIASEC (36Q, Holland career interest, 6 dimensions)
  - TIPI/Big Five (10Q, personality, 5 dimensions with reverse-scoring)
- `src/pages/PublicAssessmentPage.jsx` (NEW) — `/assess/:token` — no auth required
  - Uses `supabaseAnon` (anon key + RLS)
  - Client-side scoring — all `score()` + `interpret()` in browser, results stored in DB
  - Question-by-question nav + numbered dot overview
- `KaunslorClientFilePage`: new "Assessments" tab (7th tab, flex overflow-x-auto)
  - Assign modal: select test → creates `client_assessments` row with 40-char hex token
  - Copy shareable link → send to client (no login required)
  - View results: scores + interpretation inline
- Supabase: `client_assessments` table with RLS (owner all, anon read by token, anon update pending→completed)
- No new API functions added — stays at 12/12 Vercel limit

## Features Baru (2026-06-07 — Fasa 3)

**SOAP/DAP Structured Notes (Notes tab):**
- Type selector: Free / SOAP / DAP toggle buttons in New Note form
- SOAP fields: Subjective (blue) · Objective (green) · Assessment (violet) · Plan (amber)
- DAP fields: Data (blue) · Assessment (violet) · Plan (amber)
- `handleSaveNote()`: saves `note_type` ('soap'/'dap'/'free') + `note_data` JSONB
- `handlePrintNote()`: formatted HTML print — SOAP/DAP/Free format header, client info, signature block
- Display: structured notes render per-section with labeled headers; Print button (no Edit) for structured notes
- DB migration: `progress_notes.note_type TEXT DEFAULT 'free'` + `progress_notes.note_data JSONB`

**AI Clinical Document Generator (Plans tab):**
- "📄 Generate Support Letter / Report" button → Document Modal
- 4 document types: Employment Support / Court Support / Academic Support / Insurance Progress Report
- Counselor adds optional context → "✦ Generate with AI" → editable textarea preview → Print/Save PDF
- `doc_letter` mode in `api/suggest.js` — Claude `claude-opus-4-7` generates formal letter, Gemini fallback
- `generateDocument()` added to `src/api/claude.js` — reuses `/api/suggest` endpoint (no new function)

## Features Baru (2026-06-07 — Fasa 4)

**Digital Intake Form (`/intake/:token`):**
- `client_intake_forms` table: `token`, `subject_id`, `user_id`, `subject_name`, `status`, `expires_at`, `assigned_at`, `completed_at`, `form_answers JSONB`
- RLS: counselor owns all; anon can SELECT (to view) + UPDATE (to submit)
- `src/pages/PublicIntakePage.jsx` at `/intake/:token` — no auth required, 3-step form:
  - Step 1: Personal (name, IC, phone, email, dob, gender, marital, race, religion, occupation, address, emergency contact)
  - Step 2: Presenting concern, duration, goals, previous counseling, medications, medical conditions
  - Step 3: Risk check (self-harm/suicidal — 3-level), consent checkbox, submit
- Counselor Intake tab in KaunslorClientFilePage:
  - "+ New Intake Link" → inserts row, shows copyable `window.location.origin + /intake/TOKEN`
  - 14-day expiry shown, status badge (Pending/Completed/Expired)
  - Completed forms: "View Responses" (expandable) + "Apply to Profile" button
  - `Apply to Profile`: maps form_answers fields to `subjects` table columns

**Homework Tracker (Homework tab in KaunslorClientFilePage):**
- `client_homework` table: `title`, `description`, `due_date`, `status (pending/completed)`, `subject_id`, `user_id`
- RLS: counselor only
- Homework tab: shows task list with checkbox to toggle done/pending, due date, status badge
- "+ Add Task" modal: title (required), instructions/details, due date
- Delete per task
- Print: formatted HTML letterhead (`kaunselor.app · STRICTLY CONFIDENTIAL`)
- **Still at 12/12 functions** — no new API functions

## Features Baru (2026-06-07 — Fasa 5)

**Supervision Log (`/kaunselor/supervision`):**
- `supervision_sessions` table: `date`, `supervisor_name`, `supervisor_reg_no`, `duration_minutes`, `session_type` (individual/group/peer), `topics_discussed`, `notes`
- RLS: counselor only
- `KaunslorSupervisionPage.jsx`: stats (hours this year, lifetime hours), year filter tabs, session list with badge by type
- Add Session modal: date, duration (30min–3hr), supervisor name + reg no., session type, topics, notes
- "🖨 Print Log" → LPK-format HTML report: counselor info, all sessions table, total hours, dual signature block
- Sidebar: "Supervision" nav item added to COUNSELOR_ITEMS

**Anonymous Case Summary (KaunslorClientFilePage → Plans tab):**
- "🔒 Generate Anonymous Case Summary" button
- Replaces client name/IC with case reference `Client-XXXXXX`
- Includes: case overview, risk level, problem types, presenting issue, latest session note, current action plan
- Formatted HTML print with supervision disclaimer and dual signature block

## Hobby Plan — 12 Serverless Functions (HARD LIMIT)
Jangan tambah function baru tanpa remove/merge yang lain dulu.
Semasa (11/12): admin, cron-reset-usage, gemini, report, share-session, stripe-billing, stripe-checkout, stripe-webhook, suggest, team-invite, user-notifications
NOTE: transcribe.js adalah stub (no handler) — semua transcription di gemini.js sekarang

## AI Models
| Provider    | Model                         | Kegunaan                              |
|-------------|-------------------------------|---------------------------------------|
| Anthropic   | claude-opus-4-7               | AI analysis (suggest)                 |
| Gemini      | gemini-2.5-flash              | Diarization (batch, on end) + Import  |
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
| Plan        | Sesi/bulan | Harga/bulan | Top-up | Label UI         |
|-------------|------------|-------------|--------|------------------|
| free        | 2          | $0 USD      | No     | Free             |
| pro         | unlimited  | $22 USD     | No     | Unlimited        |
| counselor   | unlimited  | $22 USD     | Yes    | Counselor        |
| starter     | 5          | $25 USD     | Yes    | Professional (legacy) |
| biz         | unlimited  | $599 USD    | No     | Enterprise → email |

**Top-up (counselor + starter):**
- 1 session: $3 · 5 sessions: $12 · 10 sessions: $22 USD
- Stripe price IDs in Vercel: STRIPE_PRICE_TOPUP_1/5/10 (updated 2026-06-02)
- Stored in `subscriptions.extra_sessions` — never expires, not reset monthly
- **NO free trial** — `trial_period_days` removed

**PricingPage dalam app (`/pricing`):**
- Tab "VeriRec Profesional": Free ($0) + Professional ($25) + Enterprise → email
- Tab "Kaunselor": Counselor ($25) + top-up
- Pro/Biz ditunjuk sebagai Enterprise — Stripe price ID tidak diubah

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
Redesign 2026-06-02 — Soro-inspired. Sections (dalam order):
1. Hero — "Make every investigation record unchallengeable." white bg, font-black
2. Professions strip — 15 profession pills
3. Narrative — "Handwritten notes get challenged... VeriRec fixes that."
4. App mockup — SPRM session, live transcript + AI panel + PEACE phases
5. 3 Steps — nombor oversized 01/02/03
6. Features — 6 cards 3×2 grid
7. Mobile App — PWA install steps Android + iPhone, dark phone mockup
8. Who It's For — 4 compact 2×2 cards (bukan panel besar)
9. Comparison table — VeriRec vs Paper Notes vs Basic Recorder
10. Testimonials — 3-column grid, DSP Ahmad Fauzi + En. Farouk Ibrahim + Pn. Melissa Tan (commit 86e5d2e)
11. Pricing — Free ($0) + Professional ($25) + top-up $3/$12/$22
12. Final CTA + Footer

## Placeholder Names (2026-06-03 — commit 3cc7e46)
- All Malaysian name placeholders → John Doe / Insp. John, Sgt. Smith
- Files: SchedulePage, SessionSetupPage, ReportView, CasesPage, KaunslorAppointmentsPage
- CasesPage: 'Tajuk Case Files' → 'Case File Title', 'cth.' → 'e.g.'

## BM Cleanup — Final Sweep (2026-06-03 — commit 24e3b13)
- `ReportView.jsx`: ~40 BM strings → English (SOAP/NCR/DCP labels, follow-up tracker, transcript labels, signature section, PDF Chain of Custody, CONFIDENTIAL, hash verification)
- `TranscriptPanel.jsx`: Export, Flag, Transcribing
- `SharedReportPage.jsx`: All risk labels, headings, CTAs, error states
- PDF filename: `laporan-verirec-*.pdf` → `verirec-report-*.pdf`
- CLAUDE.md rule: "All UI text in English" — now fully enforced on www.verirec.app

## UI Polish + Bug Fixes (2026-06-03 — commits e4e3bf7 → 7d016db)
- CaseDetailPage sessions header: grouped secondary buttons `[+ Existing | 📁 Import | 📦 Export]` + primary `🎙 New Session`
- CaseRecordings + SessionReportPage Recordings: consistent card styling, icon per item, blue Play button
- Sidebar: `alsoActive` fn + `useLocation` — Case Files highlights on `/session/:id` (excludes setup/import/active)
- SchedulePage: Counselor removed from profession dropdown on www; default 'counselor' → 'police' in BLANK

## Recording & Navigation (2026-06-03 — commits d4ae802 → 70806d9)
- Import Recording moved OUT of SessionSetupPage, INTO CaseDetailPage sessions header ("📁 Import" → `/session/import?case_id=xxx`)
- CaseDetailPage: `CaseRecordings` component — upload raw audio/video to case file (outside sessions, no transcription)
- SessionReportPage: "Session Recordings" panel — all audio_library records for session, "Add Recording" upload, no delete (permanent)
- Back navigation: SessionReportPage `← Back` → case file if `session.case_id`, else `navigate(-1)`
- AudioLibraryPage "Start Session" CTA → `/session/setup` (was `/dashboard`)

## Import External Recording (2026-06-03 — commit ae9cbcc)
- Route: `/session/import` → `ImportSessionPage.jsx`
- Entry: "📁 Import External Recording →" button at bottom of SessionSetupPage
- Supported: MP3, M4A, MP4, WAV, OGG, WEBM, FLAC, MOV (max 500MB)
- Flow: file → Supabase `recordings` bucket (direct, bypass Vercel 4.5MB limit) → `api/transcribe?mode=import` (JSON body, signed URL) → AssemblyAI diarize → `updateSession` → `generateReport` → `/session/:id`
- `src/api/whisper.js`: `importFromStoragePath({ storagePath, interviewer, subject_name })`
- `api/transcribe.js`: `handleImport()` — creates signed URL, submits to AssemblyAI

## Session Report Features (2026-06-03)
- **Audio playback**: "Play Recording" button in SessionReportPage — fetches from audio_library by session_id, HTML5 player
- **Officer's Case Summary**: Editable amber card in ReportView — `OfficerSummarySection`, saves to `sessions.report.officerSummary` (JSONB), exported in PDF
- **PDF export**: catch block added — errors now show as toast instead of silent failure
- **useRealtimeTranscript**: 'auto' lang → 'ms-MY' (BCP47 fix for Web Speech API)
- **CaseDetailPage**: Full card clickable with 'View →' hover, Remove stops propagation

**AISuggestions locked overlay:** English + "$25/month" (updated 2026-06-02)
**ProfessionLandingPage (/polis, /sprm dll):** USD pricing — Free $0 / Professional $25 / Pro $249. All content fully in English (commit d20099e) — PROFESSION_META, PROFESSIONS data, TESTIMONIALS, CTA labels for all 9 professions.

## Security Audit (2026-06-18) — ALL ISSUES RESOLVED

Full security + scalability audit. 19 issues fixed across 3 commits (90396ec → 96b43b3 → fff3b00).

### New files added
- `api/_scoring.js` — server-side scoring for PHQ-9, GAD-7, DASS-21, RIASEC, TIPI
- `api/_cors.js` — centralised CORS with origin allowlist (verirec.app + kaunselor.app)
- `supabase/migrations/20260618_fix_rate_limits_rls.sql` — RLS on rate_limits
- `supabase/rls_snapshot_20260618.sql` — snapshot of all 38 tables + policies

### Key security conventions added/confirmed
- **Stripe MYR minimum is 200 sen (RM 2.00)**, not 100 — checked in `stripe-checkout.js`
- **admin.js POST body** — `req.body` is undefined in Vercel serverless; always use `readBody(req)` (same pattern as `stripe-checkout.js`)
- **CRON_SECRET must be set** — `cron-reset-usage.js` returns 401 if missing; set via `printf` in Bash (not PowerShell `Get-Content` which adds `\r`)
- **Rate limit is now atomic** — `increment_rate_limit()` Postgres RPC via `api/_rateLimit.js`; `_rateLimit.js` no longer does read-modify-write
- **Assessment scoring is server-side** — `PublicAssessmentPage.jsx` calls `POST /api/report?mode=score-assessment` (public, no auth); scoring logic in `api/_scoring.js`
- **user-notifications `appointment-confirmed`** — requires auth + `.eq('counselor_id', user.id)`; `new-appointment` is public but rejects if appointment >15 min old
- **Supabase queries** — always add `.limit(N)` on lists; `getSessions()` now supports `{ limit, offset }` pagination params; `getSubjects()` excludes `notes` column (long text, not needed in list)
- **PDPA**: `consent_logs` must NEVER be deleted — account deletion in `admin.js DELETE` skips this table intentionally

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
TELEGRAM_BOT_TOKEN  ← set 2026-06-02 via @BotFather
ADMIN_EMAILS        ← set 2026-06-18 (syedshazni@gmail.com) — required by admin.js
CRON_SECRET         ← set 2026-06-18 (64-char hex) — required by cron-reset-usage.js
```

## Deployment
```bash
vercel deploy --prod --force --scope syedshazni-7682s-projects
```
- www.verirec.app + counselor.verirec.app + kaunselor.app (doctor/jkm redirect ke www)
- Project ID: `prj_EwnDU0nKMOn56auUR1WZF1GeNI3f`
- GitHub: `https://github.com/shaze22/verirec` (branch: main)
- Last deployed: 2026-06-18 (commit `fff3b00` — full security audit: 9C+7H+3M issues fixed)
- ⚠️ GitHub→Vercel auto-deploy broken — always use `vercel deploy --prod --force --scope syedshazni-7682s-projects`
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

**5. FPX payment — pending MYR prices (2026-06-06)**
- FPX enabled dalam Stripe dashboard ✅
- `stripe-checkout.js` dah guna `automatic_payment_methods[enabled]: true` (commit ccd06f1) — no longer hardcodes `card` only
- FPX requires MYR currency — current prices are USD. FPX akan muncul otomatik bila MYR prices dibuat dalam Stripe dan dipilih
- FPX tidak support recurring subscriptions — boleh untuk top-up (payment mode) sahaja

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
