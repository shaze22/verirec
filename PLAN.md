# VeriRec — Fix Plan & Milestone Tracker

> Update fail ini setiap kali satu task selesai. `[x]` = selesai, `[ ]` = belum.

---

## Milestone 1 — Core UX & Compliance (Keutamaan Tinggi)

Fokus: Semua user dapat gunakan app dengan lebih yakin, selamat, dan patuh PDPA.

### 1.1 Onboarding & Discoverability
- [x] Onboarding tour / demo sesi (guided walkthrough first-time user)
- [x] Tooltip konteks pada setiap field dalam SessionSetupPage
- [x] Empty state yang bermaklumat dalam DashboardPage (dengan arahan langkah demi langkah)

### 1.2 Laporan & Anotasi
- [x] Follow-up tracker dalam laporan (checklist interaktif, disimpan dalam localStorage)
- [x] Anotasi laporan oleh penemuduga (nota peribadi per-sesi, disimpan dalam localStorage)
- [x] Carian sesi — cari melalui tajuk, subjek, profesion, dan ringkasan laporan

### 1.3 Kaunselor — Protokol Krisis
- [x] Pengesan red flag dalam transkrip (kata kunci bahaya dikesan secara automatik semasa sesi)
- [x] Banner amaran merah semasa sesi apabila red flag dikesan
- [x] Auto-flag entri transkrip yang mengandungi kata kunci bahaya
- [x] Rujukan sumber kecemasan (Talian Kasih, MIASA, Befrienders) dalam laporan dan banner sesi
- [x] `crisisIndicators` dalam laporan AI untuk kaunselor dan doktor

### 1.4 Akaun & PDPA
- [x] Tukar kata laluan dalam halaman Tetapan
- [x] Eksport data PDPA (muat turun JSON semua sesi dan maklumat akaun)
- [x] Padam akaun + semua data PDPA (dengan pengesahan e-mel)
- [x] Penarikan semula kebenaran (maklumat dan e-mel kepada privacy@verirec.my)
- [x] Tetapan pengekalan data (90 / 180 / 365 / 730 hari, disimpan dalam localStorage)

---

## Milestone 2 — Pengurusan Subjek & Kes

Fokus: Polis, SPRM, HR — mereka urus banyak kes, bukan sesi tunggal.

### 2.1 Profil Subjek
- [ ] Sistem profil subjek/klien (buat sekali, guna berulang kali)
- [ ] Carian subjek dalam SessionSetupPage

### 2.2 Fail Kes
- [ ] Fail kes (kumpulkan beberapa sesi dalam satu kes)
- [x] Nombor kes dalam SessionSetupPage (per-profesion: laporan polis, kes SPRM, kes tatatertib, dll.)
- [x] Pegawai saksi dalam SessionSetupPage (per-profesion, muncul dalam laporan)
- [ ] Penandatanganan penyataan oleh subjek selepas sesi (e-signature / acknowledgement)

### 2.3 Kerjasama
- [x] Anotasi / nota peribadi per-sesi (dalam ReportView, tidak termasuk dalam laporan rasmi)
- [x] Status kes (Aktif / Ditangguhkan / Ditutup)

---

## Milestone 3 — Keselamatan & Akauntabiliti

Fokus: Institusi, ketua jabatan, dan pematuhan dalaman.

- [ ] Pengesahan dua faktor (2FA) — TOTP atau OTP SMS
- [ ] Log audit penuh (siapa akses laporan, bila, dari IP mana)
- [ ] Perlindungan laporan dengan PIN/kata laluan tambahan
- [ ] Mod tiada internet / offline (IndexedDB — asas sudah ada, perlu polish)

---

## Milestone 4 — Output Khusus Profesion

Fokus: Output yang sesuai dengan format kerja setiap profesion.

### 4.1 Doktor / Psikiatri
- [x] Format output SOAP (Subjective, Objective, Assessment, Plan) dalam laporan
- [x] Penunjuk krisis dalam laporan (`crisisIndicators` — tahap none/watch/critical)

### 4.2 ISO Auditor
- [x] Jana NCR/CAR (Nonconformance Report / Corrective Action Report) dalam laporan
- [x] Pemetaan penemuan kepada klausa ISO berkaitan

### 4.3 HR & Disiplin
- [x] Ringkasan siasatan DCP (Domestic Inquiry) dalam laporan
- [x] Template surat amaran dari transkrip sesi

### 4.4 Polis / SPRM
- [x] Ringkasan penyataan rasmi (fakta utama, ketidakkonsistenan, nota bukti) dalam laporan
- [x] Nombor kes dan pegawai saksi terpapar dalam header laporan

---

## Milestone 5 — Pasukan & Analitik

Fokus: Pengurus, ketua pasukan, dan keputusan berasaskan data.

### 5.1 Pengurusan Pasukan
- [ ] Jemput ahli pasukan (invite by email)
- [ ] Peranan pengguna: Admin, Penemuduga, Penonton (read-only)
- [ ] Pengagihan sesi kepada ahli pasukan

### 5.2 Analitik
- [x] Dashboard analitik (jumlah sesi, trend risiko, purata tempoh)
- [ ] Laporan mingguan/bulanan dihantar ke emel
- [ ] Penapis dan eksport data analitik (CSV)

### 5.3 Notifikasi
- [ ] Sistem notifikasi emel (sesi selesai, laporan sedia, kuota hampir penuh)
- [ ] Peringatan tindakan susulan dari follow-up tracker

### 5.4 Operasi Pukal
- [ ] Pilih berbilang sesi → eksport pukal PDF
- [x] Pilih berbilang sesi → padam pukal

---

## Selesai (Rujukan)

Senarai fix yang telah dilakukan:

### Sesi 2026-05-20 (Sesi Terkini)
- [x] Status kes dalam SessionReportPage (dropdown Aktif/Ditangguhkan/Ditutup, simpan ke Supabase)
- [x] Badge status kes dalam DashboardPage (tunjuk jika bukan Aktif)
- [x] Padam pukal — pilih beberapa sesi dalam DashboardPage dan padam sekaligus
- [x] Analytics page (/analytics) — jumlah sesi, 30 hari lepas, laporan dijana, purata tempoh, by-profesion bar chart, taburan risiko, status kes
- [x] Template surat amaran HR dalam ReportView (jana draf dari laporan DCP, salin ke clipboard)
- [x] Sidebar dan BottomNav dikemas kini dengan pautan Analitik
- [x] Tooltip pada semua field SessionSetupPage (icon info + teks konteks)
- [x] Nombor kes + pegawai saksi dalam SessionSetupPage (per-profesion)
- [x] Tukar kata laluan dalam SettingsPage
- [x] Eksport data PDPA (JSON download) dalam SettingsPage
- [x] Padam akaun dengan pengesahan e-mel dalam SettingsPage
- [x] Tetapan pengekalan data dalam SettingsPage
- [x] Maklumat penarikan kebenaran PDPA dalam SettingsPage
- [x] Pengesan red flag masa nyata dalam SessionPage (semua profesion, ikut `redFlagKeywords`)
- [x] Banner amaran krisis merah semasa sesi (kaunselor & doktor)
- [x] Auto-flag entri berbahaya dalam senarai bendera
- [x] Follow-up tracker interaktif dalam ReportView (checklist + progress bar, localStorage)
- [x] Anotasi peribadi dalam ReportView (editor teks, localStorage)
- [x] Nombor kes + pegawai saksi dalam header laporan ReportView
- [x] Seksyen SOAP Note dalam laporan doktor
- [x] Seksyen NCR/CAR dalam laporan ISO auditor
- [x] Seksyen DCP dalam laporan HR
- [x] Seksyen ringkasan penyataan dalam laporan polis/SPRM
- [x] Seksyen `crisisIndicators` dalam laporan kaunselor
- [x] `api/report.js` — prompt AI ikut profesion (SOAP, NCR, DCP, penyataan, krisis)
- [x] `api/report.js` — `followUpItems` sebagai senarai tindakan spesifik dari AI
- [x] DashboardPage — carian merangkumi `report.summary` dan `report.keyFindings`
- [x] DashboardPage — preview ringkasan laporan dalam kad sesi

### Sesi Sebelum (Teknikal)
- [x] Hash chain of custody — buang timestamp dari payload
- [x] Had saiz body request API (`MAX_BODY_BYTES = 3MB`)
- [x] Claude retry dengan exponential backoff (3 percubaan, tangkap 529)
- [x] Idempotency check laporan
- [x] Debounce timer per-kunci
- [x] AudioContext dalam `useRef` + cleanup
- [x] `pickMimeType()` untuk Safari/iOS
- [x] Guard ConsentPage + `consentTimestamp` stabil
- [x] Race condition authStore (`authStateSettled`)
- [x] Setup sesi diparse sekali (`useRef`)
- [x] Kunci merentas tab untuk jana laporan
- [x] Progress langkah menjana laporan

### Sesi Sebelum (UI/UX & Branding)
- [x] Landing page penuh
- [x] Halaman FAQ
- [x] BottomNav mudah alih
- [x] Sidebar — ikon SVG, buang Pelan & Harga
- [x] Favicon SVG
- [x] AI Suggestions — blur preview untuk pengguna percuma
- [x] Skeleton loading DashboardPage
- [x] Guard navigasi SessionSetupPage
- [x] Auth — lupa kata laluan + `?mode=register`
- [x] Pricing page — badge Popular, harga tahunan
- [x] Hash verification dalam ReportView

---

_Dikemas kini: 2026-05-20 (kemas kini kedua)_
