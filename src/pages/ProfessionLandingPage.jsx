import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

const Logo = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="w-8 h-8 flex-shrink-0">
    <rect width="32" height="32" rx="8" fill="#2563eb"/>
    <polyline points="4,16 7,11 10,21 13,9 16,23 19,11 22,18 25,14 28,16"
      stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
  </svg>
);

const PROFESSION_META = {
  counselor: {
    title: 'VeriRec untuk Kaunselor — Nota SOAP & Pengesanan Krisis AI Masa Nyata',
    desc:  'Rakam sesi kaunseling, kesan tanda bahaya bunuh diri secara automatik, dan jana nota klinikal dalam masa seminit. Cuba percuma — 2 sesi pertama.',
  },
  police: {
    title: 'VeriRec untuk Polis — Rakaman Soal Siasat dengan Chain of Custody SHA-256',
    desc:  'Rakam soal siasat saksi dan suspek mengikut PEACE Model. Jana laporan penyataan rasmi dan buktikan integriti rekod di mahkamah.',
  },
  sprm: {
    title: 'VeriRec untuk SPRM/MACC — Dokumentasi Siasatan Anti-Rasuah',
    desc:  'Platform rakaman soal siasat kes rasuah dengan chain of custody sah di sisi UNCAC dan Seksyen 17 SPRM 2009. Hubungi kami untuk demo.',
  },
  doctor: {
    title: 'VeriRec untuk Doktor — Nota SOAP Automatik dalam 60 Saat',
    desc:  'Rakam anamnesis pesakit, jana nota SOAP secara automatik, dan kesan tanda krisis psikiatri masa nyata. Cuba percuma — 2 konsultasi pertama.',
  },
  iso: {
    title: 'VeriRec untuk Juruaudit ISO — NCR dan CAR Automatik mengikut ISO 9001:2015',
    desc:  'Rakam sesi audit, jana Nonconformance Report dan Corrective Action Report automatik. Jimat 2-3 jam dokumentasi setiap sesi audit.',
  },
  hr: {
    title: 'VeriRec untuk HR — Inkuiri Domestik yang Telus dan Sah Undang-undang',
    desc:  'Rakam sesi Inkuiri Domestik dengan chain of custody SHA-256. Jana laporan siasatan mengikut Akta Kerja 1955. Cuba percuma.',
  },
  court: {
    title: 'VeriRec untuk Mahkamah — Analisa Keterangan Saksi Masa Nyata',
    desc:  'Kesan percanggahan keterangan saksi, dapatkan cadangan soalan pemeriksaan balas dari AI, dan dokumentasikan prosiding dengan SHA-256.',
  },
  peguam: {
    title: 'VeriRec untuk Peguam — Dokumentasi Perundingan & Analisa Jurang Kes AI',
    desc:  'Rakam perundingan klien, analisa jurang fakta kes secara realtime, dan jana laporan perundingan berstruktur. Legal Professional Privilege terjaga.',
  },
  jkm: {
    title: 'VeriRec untuk Pegawai JKM — Penilaian Risiko Kanak-kanak dengan AI',
    desc:  'Rakam temubual kebajikan, kesan petanda bahaya kanak-kanak berisiko secara realtime, dan jana laporan kes kukuh untuk tindakan mahkamah.',
  },
};

const BASE_URL = 'https://verirec.vercel.app';

const PROFESSIONS = {
  counselor: {
    label: 'Kaunselor',
    hex: '#10b981',
    badge: 'LKM · PDPA 2010 · Crisis Detection',
    headline: 'Fokus pada Klien.',
    headlineAccent: 'VeriRec Uruskan Dokumentasi.',
    sub: 'Rakam sesi kaunseling, kesan tanda bahaya bunuh diri secara automatik, dan jana nota klinikal dalam masa seminit.',
    ctaText: 'Cuba Percuma — 2 Sesi Kaunseling',
    enterpriseCta: false,
    painPoints: [
      { icon: '⏱', title: 'Nota manual makan 2 jam sehari', desc: 'Setiap sesi makan 30-60 minit untuk ditulis semula. VeriRec jana laporan AI dalam masa seminit.' },
      { icon: '🚨', title: 'Tanda bahaya krisis boleh terlepas pandang', desc: 'Dalam sesi intensif, kata kunci seperti "bunuh diri" mungkin tidak diperasan. VeriRec kesan automatik.' },
      { icon: '📋', title: 'PDPA sukar dipatuhi secara manual', desc: 'Rekod persetujuan klien yang tidak konsisten mendedahkan anda kepada risiko undang-undang.' },
    ],
    features: [
      { title: 'Pengesan Krisis Masa Nyata', desc: 'Kata kunci bahaya dikesan semasa sesi. Banner amaran merah muncul serta-merta dengan nombor Talian Kasih 15999 dan MIASA.' },
      { title: 'Nota SOAP Automatik', desc: 'Laporan mengandungi nota klinikal format SOAP (Subjective, Objective, Assessment, Plan) — siap untuk fail klien.' },
      { title: 'Rekod Persetujuan PDPA Kekal', desc: 'Borang persetujuan digital dengan timestamp untuk setiap klien. Audit trail yang tidak boleh dipadam.' },
      { title: 'Follow-up Tracker', desc: 'Senarai tindakan susulan yang dijana AI. Track kemajuan klien merentasi sesi dengan checklist interaktif.' },
      { title: 'Rekod Cepat', desc: 'Mulakan rakaman serta-merta tanpa isi borang — sesuai untuk keadaan mendesak. Butiran klien boleh dilengkapkan selepas sesi tamat.' },
      { title: 'Perpustakaan Audio', desc: 'Semua rakaman sesi disimpan selamat dalam perpustakaan peribadi. Putar semula, namakan semula, dan kaitkan audio dengan fail klien untuk rujukan masa hadapan.' },
    ],
  },
  police: {
    label: 'Polis',
    hex: '#3b82f6',
    badge: 'PEACE Model · Cognitive Interview · SHA-256',
    headline: 'Rakaman Soal Siasat',
    headlineAccent: 'Yang Tidak Boleh Dicabar di Mahkamah.',
    sub: 'Rakam soal siasat saksi dan suspek dengan chain of custody SHA-256. Jana laporan format penyataan rasmi secara automatik.',
    ctaText: 'Cuba Percuma — 2 Sesi Soal Siasat',
    enterpriseCta: false,
    painPoints: [
      { icon: '⚖️', title: 'Peguam boleh persoalkan ketulenan penyataan', desc: 'Penyataan manual tidak ada bukti integriti. Hash SHA-256 VeriRec buktikan laporan tidak diubah.' },
      { icon: '⏱', title: 'Transkripsi manual mengambil berjam-jam', desc: 'Setiap jam rakaman = 4-6 jam transkripsi manual. VeriRec buat dalam masa minit.' },
      { icon: '📄', title: 'Format penyataan tidak konsisten', desc: 'Format berbeza antara pegawai. VeriRec standardkan output penyataan untuk semua kes.' },
    ],
    features: [
      { title: 'Chain of Custody SHA-256', desc: 'Setiap laporan disahkan dengan hash kriptografi. Buktikan laporan tidak diubah — penting untuk prosiding mahkamah.' },
      { title: 'Format Penyataan Rasmi', desc: 'Fakta utama, ketidakkonsistenan yang dikenal pasti, dan nota bukti dijana dalam format berstruktur.' },
      { title: 'Nombor Kes & Pegawai Saksi', desc: 'Nombor laporan polis dan pegawai saksi direkod dalam setiap sesi dan terpapar dalam laporan rasmi.' },
      { title: 'PEACE Model & Cognitive Interview', desc: 'Soalan cadangan AI ikut rangka kerja PEACE Model dan Cognitive Interview yang diiktiraf antarabangsa.' },
      { title: 'Rekod Cepat', desc: 'Mulakan sesi siasatan serta-merta tanpa borang — berguna dalam situasi masa kritikal. Butiran kes boleh ditambah selepas sesi.' },
      { title: 'Perpustakaan Audio', desc: 'Semua rakaman soal siasat disimpan selamat. Putar semula dan kaitkan audio dengan nombor kes untuk dokumentasi kes yang lengkap.' },
    ],
  },
  sprm: {
    label: 'SPRM / MACC',
    hex: '#8b5cf6',
    badge: 'UNCAC · Seksyen 17 SPRM 2009 · SHA-256',
    headline: 'Dokumentasi Siasatan',
    headlineAccent: 'Yang Tidak Boleh Diganggu-gugat.',
    sub: 'Rakam soal siasat kes rasuah dengan chain of custody sah di sisi UNCAC dan Seksyen 17 SPRM 2009.',
    ctaText: 'Hubungi Kami untuk Demo',
    enterpriseCta: true,
    painPoints: [
      { icon: '⚖️', title: 'Bukti perbualan boleh dipersoalkan', desc: 'Tanpa rekod digital kukuh, peguam boleh persoalkan ketepatan dan ketulenan penyataan dalam mahkamah.' },
      { icon: '⏱', title: 'Proses dokumentasi lambat', desc: 'Masa yang dihabiskan untuk dokumentasi mengurangkan keupayaan untuk menjalankan lebih banyak siasatan.' },
      { icon: '📋', title: 'Pematuhan UNCAC memerlukan rekod tepat', desc: 'Piawaian antarabangsa memerlukan dokumentasi siasatan yang boleh diaudit dan disahkan secara bebas.' },
    ],
    features: [
      { title: 'Chain of Custody SHA-256', desc: 'Hash kriptografi yang boleh disahkan semula dari data tersimpan. Selamat untuk prosiding undang-undang.' },
      { title: 'Pemberitahuan Hak Automatik', desc: 'Rangka kerja soalan mengikut prosedur Seksyen 17 SPRM 2009 termasuk pemberitahuan hak pihak yang disiasat.' },
      { title: 'Ringkasan Penyataan Berstruktur', desc: 'Fakta utama, ketidakkonsistenan, dan nota bukti dalam format sesuai untuk pendakwa raya.' },
      { title: 'Nombor Kes & Pegawai Pendakwa', desc: 'Nombor kes SPRM dan pegawai pendakwa direkod dalam setiap sesi untuk rujukan silang yang mudah.' },
      { title: 'Rekod Cepat', desc: 'Mulakan siasatan serta-merta tanpa isi borang. Sesuai untuk situasi masa kritikal — butiran kes boleh ditambah selepas sesi.' },
      { title: 'Perpustakaan Audio', desc: 'Rakaman siasatan disimpan selamat dengan chain of custody SHA-256. Kaitkan audio dengan nombor kes untuk audit trail yang lengkap.' },
    ],
  },
  doctor: {
    label: 'Doktor',
    hex: '#ef4444',
    badge: 'SOAP Note · Calgary-Cambridge · PDPA 2010',
    headline: 'Nota SOAP Automatik.',
    headlineAccent: 'Lebih Masa untuk Pesakit.',
    sub: 'Rakam anamnesis pesakit, jana nota SOAP dalam 60 saat, dan simpan rekod dengan selamat mengikut keperluan klinikal.',
    ctaText: 'Cuba Percuma — 2 Konsultasi',
    enterpriseCta: false,
    painPoints: [
      { icon: '⏱', title: 'Nota makan 30-40% masa kerja doktor', desc: 'Menulis nota selepas setiap pesakit mengurangkan bilangan pesakit yang boleh dilihat setiap hari.' },
      { icon: '📝', title: 'Sejarah penyakit tidak lengkap', desc: 'Dalam konsultasi pantas, butiran penting boleh terlepas. Transkripsi penuh memastikan tiada yang tertinggal.' },
      { icon: '⚠️', title: 'Tanda krisis psikiatri boleh terlepas', desc: 'Kata kunci seperti "bunuh diri" memerlukan perhatian segera yang mungkin sukar semasa konsultasi sibuk.' },
    ],
    features: [
      { title: 'Nota SOAP Automatik', desc: 'Subjective, Objective, Assessment, Plan dijana daripada perbualan pesakit. Tiada lagi tulis nota dari awal.' },
      { title: 'Pengesan Krisis Psikiatri', desc: 'Tanda bahaya psikiatri dikesan masa nyata semasa konsultasi dengan rujukan sumber kecemasan.' },
      { title: 'Transkripsi Bahasa Malaysia', desc: 'Whisper AI sokong Bahasa Malaysia termasuk istilah perubatan dan campuran bahasa dalam konteks klinikal.' },
      { title: 'Rekod Pesakit Selamat', desc: 'Semua rekod disulitkan. Hanya anda yang boleh akses rekod pesakit anda — pematuhan penuh PDPA 2010.' },
      { title: 'Rekod Cepat', desc: 'Mulakan konsultasi serta-merta tanpa isi borang. Sesuai untuk klinik sibuk — butiran pesakit boleh dikemaskini selepas konsultasi.' },
      { title: 'Perpustakaan Audio', desc: 'Rakaman anamnesis disimpan selamat dalam perpustakaan. Kaitkan audio dengan rekod pesakit untuk rujukan klinikal masa hadapan.' },
    ],
  },
  iso: {
    label: 'Juruaudit ISO',
    hex: '#f59e0b',
    badge: 'ISO 9001:2015 · ISO 19011:2018 · PDCA',
    headline: 'NCR dan CAR Automatik.',
    headlineAccent: 'Audit Lebih Efisien.',
    sub: 'Rakam sesi audit, jana Nonconformance Report (NCR) dan Corrective Action Report (CAR) mengikut ISO 9001:2015 secara automatik.',
    ctaText: 'Cuba Percuma — 2 Sesi Audit',
    enterpriseCta: false,
    painPoints: [
      { icon: '⏱', title: 'Tulis NCR/CAR manual makan 2-3 jam', desc: 'Selepas setiap sesi audit, auditor terpaksa tulis laporan panjang dari nota tangan. VeriRec jana automatik.' },
      { icon: '📋', title: 'Format NCR tidak konsisten antara auditor', desc: 'Format berbeza menjejaskan kredibiliti laporan dan susah untuk dikompil dalam laporan akhir audit.' },
      { icon: '🔍', title: 'Sukar track tindakan pembetulan', desc: 'Tindakan pembetulan dari audit lepas mudah terlupa tanpa sistem tracking yang teratur.' },
    ],
    features: [
      { title: 'NCR/CAR Automatik', desc: 'Nonconformance, klausa ISO berkaitan, punca akar, dan tindakan pembetulan dijana daripada transkrip audit.' },
      { title: 'Follow-up Tracker', desc: 'Semua tindakan pembetulan dalam senarai interaktif dengan tarikh sasaran. Track hingga closure.' },
      { title: 'Nombor Audit & Wakil Auditee', desc: 'Nombor audit dan wakil auditee direkod dalam setiap sesi untuk dokumentasi audit trail yang lengkap.' },
      { title: 'Chain of Custody SHA-256', desc: 'Rekod audit tidak boleh diubah selepas dijana — penting untuk akreditasi badan pensijilan.' },
      { title: 'Rekod Cepat', desc: 'Mulakan sesi audit serta-merta tanpa isi borang. Butiran auditee boleh ditambah selepas sesi — tanpa ganggu aliran audit.' },
      { title: 'Perpustakaan Audio', desc: 'Rakaman sesi audit disimpan selamat. Kaitkan audio dengan nombor audit untuk dokumentasi audit trail yang lengkap dan boleh dirujuk semula.' },
    ],
  },
  hr: {
    label: 'Penyiasat HR',
    hex: '#6366f1',
    badge: 'EA 1955 · PDPA 2010 · SHA-256 Chain of Custody',
    headline: 'Inkuiri Domestik',
    headlineAccent: 'Yang Telus dan Sah Undang-Undang.',
    sub: 'Rakam sesi Inkuiri Domestik (ID) dengan chain of custody yang tidak boleh dimanipulasi. Jana laporan siasatan mengikut Akta Kerja 1955.',
    ctaText: 'Cuba Percuma — 2 Sesi Siasatan',
    enterpriseCta: false,
    painPoints: [
      { icon: '⚖️', title: 'Pekerja boleh cabar proses siasatan', desc: 'Proses inkuiri domestik yang tidak berdokumen mendedahkan syarikat kepada risiko tuntutan mahkamah perusahaan.' },
      { icon: '📄', title: 'Laporan siasatan tidak standard', desc: 'Format berbeza mengikut HR officer mendedahkan syarikat kepada risiko prosedural dalam Tribunal Perusahaan.' },
      { icon: '📋', title: 'Rekod PDPA pekerja sukar diurus', desc: 'Maklumat pekerja dalam siasatan tertakluk PDPA 2010. Dokumentasi manual tidak mencukupi untuk audit.' },
    ],
    features: [
      { title: 'Laporan Inkuiri Domestik Berstruktur', desc: 'Tuduhan, penemuan siasatan, cadangan, dan hukuman yang dicadangkan dijana mengikut format Inkuiri Domestik (ID) standard.' },
      { title: 'Chain of Custody SHA-256', desc: 'Rekod siasatan tidak boleh dimanipulasi — sempurna sebagai bukti dalam prosiding IR/mahkamah buruh.' },
      { title: 'Nombor Kes & Pegawai Saksi', desc: 'Nombor kes tatatertib, pegawai HR, dan saksi periksa direkod dalam setiap sesi secara formal.' },
      { title: 'Rekod Persetujuan PDPA Kekal', desc: 'Rekod persetujuan pekerja disimpan kekal. Pematuhan penuh PDPA 2010 untuk data pekerja yang sensitif.' },
      { title: 'Rekod Cepat', desc: 'Mulakan inkuiri domestik serta-merta tanpa isi borang. Butiran kes tatatertib boleh ditambah selepas sesi tamat.' },
      { title: 'Perpustakaan Audio', desc: 'Rakaman inkuiri disimpan selamat sebagai bukti tambahan. Kaitkan audio dengan nombor kes tatatertib untuk dokumentasi yang kukuh di Tribunal Perusahaan.' },
    ],
  },
  jkm: {
    label: 'Pegawai JKM',
    hex: '#0d9488',
    badge: 'Akta Kanak-kanak 2001 · Akta Keganasan Rumah Tangga 1994 · JKM',
    headline: 'Lindungi. Dokumen.',
    headlineAccent: 'Selamatkan Nyawa dengan Data.',
    sub: 'Rakam temubual kebajikan, kesan petanda bahaya kanak-kanak berisiko secara realtime, dan jana laporan kes yang kukuh untuk tindakan mahkamah.',
    ctaText: 'Cuba Percuma — 2 Sesi Kebajikan',
    enterpriseCta: false,
    painPoints: [
      { icon: '🚨', title: 'Petanda bahaya kanak-kanak boleh terlepas pandang', desc: 'Dalam temubual yang sensitif, tanda-tanda penderaan atau pengabaian mungkin tidak diperasan. AI VeriRec kesan secara automatik semasa sesi.' },
      { icon: '📝', title: 'Laporan kes untuk mahkamah memerlukan dokumentasi tepat', desc: 'Laporan kebajikan yang tidak lengkap boleh menyebabkan kes tumbang di mahkamah. VeriRec jana laporan berstruktur dan tidak boleh dimanipulasi.' },
      { icon: '📂', title: 'Beban kerja kes yang tinggi mengurangkan kualiti dokumentasi', desc: 'Pegawai JKM menguruskan puluhan kes serentak. Transkripsi automatik VeriRec jimat masa dan tingkatkan kualiti rekod.' },
    ],
    features: [
      { title: 'Pengesanan Petanda Bahaya AI Masa Nyata', desc: 'Kata kunci risiko seperti "penderaan", "takut", "bekas luka" dikesan semasa sesi. Banner amaran merah muncul serta-merta untuk tindakan segera.' },
      { title: 'Laporan Penilaian Risiko Berstruktur', desc: 'Laporan mengandungi petanda risiko, faktor pelindung, tahap bahaya (Rendah/Sederhana/Tinggi), dan cadangan intervensi — siap untuk mahkamah.' },
      { title: 'Sokongan Temubual Trauma-Informed', desc: 'AI cadangkan soalan susulan yang sesuai untuk temubual kanak-kanak dan keluarga berisiko mengikut garis panduan trauma-informed care.' },
      { title: 'Chain of Custody SHA-256', desc: 'Setiap rekod temubual disahkan dengan hash kriptografi. Laporan tidak boleh dimanipulasi — penting untuk prosiding mahkamah kebajikan.' },
      { title: 'Rekod Cepat', desc: 'Mulakan temubual serta-merta dalam situasi kecemasan kebajikan. Tiada borang diperlukan — fokus pada keselamatan individu terlebih dahulu.' },
      { title: 'Perpustakaan Audio', desc: 'Rakaman temubual disimpan selamat. Kaitkan audio dengan fail kes kebajikan untuk dokumentasi lengkap yang boleh dikemukakan ke mahkamah.' },
    ],
  },
  peguam: {
    label: 'Peguam',
    hex: '#0891b2',
    badge: 'Legal Professional Privilege · Akta Profesion Undang-Undang 1976 · Bar Council',
    headline: 'Fokus pada Strategi.',
    headlineAccent: 'VeriRec Uruskan Dokumentasi Kes.',
    sub: 'Rakam perundingan klien dan temubual saksi, analisa jurang fakta secara realtime, dan jana laporan kes berstruktur dalam masa seminit.',
    ctaText: 'Cuba Percuma — 2 Sesi Guaman',
    enterpriseCta: false,
    painPoints: [
      { icon: '📝', title: 'Nota perundingan klien makan masa berjam-jam', desc: 'Setiap perundingan memerlukan transkripsi manual yang mengambil masa. VeriRec jana laporan berstruktur dalam masa seminit.' },
      { icon: '🔍', title: 'Jurang fakta kes mudah terlepas pandang', desc: 'Dalam sesi panjang, maklumat kritikal boleh terlepas. AI VeriRec kesan jurang dan cadang soalan susulan secara realtime.' },
      { icon: '📂', title: 'Pengurusan fail kes yang tidak efisien', desc: 'Rekod perundingan dalam pelbagai format menyukarkan rujukan silang. VeriRec standardkan dokumentasi semua kes.' },
    ],
    features: [
      { title: 'Analisa Jurang Kes AI Masa Nyata', desc: 'AI analisa perbualan semasa perundingan — kesan jurang fakta, risiko undang-undang, dan cadang soalan susulan yang tepat tanpa perlu klik.' },
      { title: 'Laporan Perundingan Berstruktur', desc: 'Fakta kes, isu undang-undang, risiko, dan strategi yang disyorkan dijana automatik mengikut format fail guaman yang profesional.' },
      { title: 'Legal Professional Privilege Terjaga', desc: 'Semua rekod disimpan dengan enkripsi penuh. Chain of custody SHA-256 membuktikan integriti dokumen perundingan sulit.' },
      { title: 'Rekod Persetujuan PDPA Kekal', desc: 'Persetujuan klien untuk rakaman direkod digital dengan timestamp. Audit trail kekal untuk pematuhan PDPA 2010.' },
      { title: 'Rekod Cepat', desc: 'Mulakan perundingan serta-merta tanpa setup panjang. Butiran klien boleh ditambah selepas sesi — sesuai untuk perundingan mendesak.' },
      { title: 'Perpustakaan Audio', desc: 'Rakaman perundingan disimpan selamat di bawah Legal Professional Privilege. Kaitkan audio dengan fail klien untuk rujukan strategi kes.' },
    ],
  },
  court: {
    label: 'Peguam & Mahkamah',
    hex: '#1e40af',
    badge: 'Akta Keterangan 1950 · KPJ · Kaedah Mahkamah 2012',
    headline: 'Analisa Keterangan Saksi',
    headlineAccent: 'Masa Nyata. Semasa Prosiding.',
    sub: 'Kesan percanggahan dalam keterangan saksi, dapatkan cadangan soalan pemeriksaan balas dari AI, dan dokumentasikan setiap prosiding dengan chain of custody SHA-256.',
    ctaText: 'Cuba Percuma — 2 Sesi Mahkamah',
    enterpriseCta: false,
    painPoints: [
      { icon: '🔍', title: 'Percanggahan keterangan sukar dikesan dalam masa nyata', desc: 'Semasa pemeriksaan balas yang pantas, percanggahan dengan keterangan terdahulu mudah terlepas pandang. VeriRec kesan automatik.' },
      { icon: '📝', title: 'Nota mahkamah manual membuang tumpuan', desc: 'Menulis nota semasa prosiding mengurangkan tumpuan terhadap saksi. Transkripsi automatik VeriRec bebaskan peguam untuk fokus.' },
      { icon: '⚖️', title: 'Dokumentasi prosiding tidak konsisten', desc: 'Nota tangan berbeza antara kes menjejaskan penyediaan hujahan. Rekod digital berstruktur memudahkan rujukan silang.' },
    ],
    features: [
      { title: 'Analisa Keterangan AI Masa Nyata', desc: 'AI analisa keterangan saksi setiap beberapa ayat — kesan percanggahan, kelemahan keterangan, dan cadang soalan pemeriksaan balas yang berkesan.' },
      { title: 'Cadangan Soalan Pemeriksaan Balas', desc: 'Berdasarkan konteks keterangan semasa, AI cadangkan soalan susulan yang boleh diklik terus untuk guna dalam prosiding.' },
      { title: 'Chain of Custody SHA-256', desc: 'Setiap rekod prosiding disahkan dengan hash kriptografi. Buktikan transkrip tidak diubah — sah sebagai rujukan dokumentasi.' },
      { title: 'Nombor Kes & Peguam Bertentangan', desc: 'Nombor kes mahkamah, peguam bertentangan, dan hakim direkod dalam setiap sesi untuk dokumentasi yang lengkap dan formal.' },
      { title: 'Rekod Cepat', desc: 'Mulakan rakaman prosiding serta-merta tanpa isi borang. Butiran mahkamah boleh ditambah selepas prosiding tamat.' },
      { title: 'Perpustakaan Audio', desc: 'Rakaman prosiding disimpan selamat. Kaitkan audio dengan nombor kes mahkamah untuk dokumentasi lengkap yang boleh dirujuk semasa rayuan.' },
    ],
  },
};

const STEPS = [
  { num: '01', title: 'Isi Butiran atau Rekod Terus', desc: 'Isi nama subjek dan nombor kes (2 minit), atau guna Rekod Cepat — terus rakam tanpa borang. Butiran boleh dilengkap selepas sesi.' },
  { num: '02', title: 'Dapatkan Persetujuan & Rekod', desc: 'Subjek tandatangani borang persetujuan digital. Mulakan rakaman dengan satu klik. Audio disimpan automatik ke Perpustakaan.' },
  { num: '03', title: 'Jana Laporan AI', desc: 'Tamatkan sesi. Laporan lengkap dengan chain of custody SHA-256 dijana dalam masa 60 saat. Audio tersimpan dalam perpustakaan untuk rujukan masa hadapan.' },
];

const TESTIMONIALS = {
  counselor: [
    { quote: 'Pengesanan tanda bahaya bunuh diri masa nyata beri saya keyakinan kendalikan kes kritikal. AI kesan kata kunci "tidak mahu hidup" — saya dapat bertindak lebih cepat dari biasa.', name: 'Pn. Suraya Ahmad', role: 'Kaunselor Berdaftar LKM', org: 'Pusat Kaunseling Cahaya, KL' },
    { quote: 'Dulu 45 minit tulis nota selepas setiap sesi. Sekarang nota SOAP siap dalam seminit. Saya boleh terima 3-4 klien tambahan setiap minggu.', name: 'En. Rizal Hamidon', role: 'Kaunselor Perkahwinan', org: 'Pusat Kebajikan Islam Selangor' },
    { quote: 'Rekod persetujuan PDPA digital beri saya ketenangan. Tiada lagi risiko kes tumbang kerana borang persetujuan hilang atau tidak lengkap.', name: 'Pn. Nurul Huda Ismail', role: 'Kaunselor Sekolah', org: 'SMK Subang Utama' },
  ],
  police: [
    { quote: 'Hash SHA-256 pada setiap laporan soal siasat kami — peguam pembela tidak dapat persoalkan integriti rakaman lagi. Ini ubah cara kami dokumentasi kes.', name: 'DSP Ahmad Fauzi Halim', role: 'Ketua Jabatan Siasatan Jenayah', org: 'IPD Petaling Jaya' },
    { quote: 'Transkripsi 2 jam rakaman yang dulu ambil hampir sehari kerja kini siap dalam 10 minit. Kami boleh fokus sepenuhnya pada siasatan.', name: 'Insp. Hairul Nizam', role: 'Pegawai Penyiasat D9', org: 'Balai Polis Damansara' },
    { quote: 'Format penyataan yang konsisten antara semua pegawai memudahkan kerja pendakwaan. Peguam Negara sangat berpuas hati dengan kualiti dokumentasi kami.', name: 'ASP Zulaikha Ramli', role: 'Pegawai Penyiasat Kanan', org: 'IPD Shah Alam' },
  ],
  sprm: [
    { quote: 'Dokumentasi siasatan kami kini memenuhi piawaian UNCAC sepenuhnya. Chain of custody yang tidak boleh dipersoalkan membantu kes kami berjaya di mahkamah.', name: 'TPR Hafizuddin Malik', role: 'Pegawai Penyiasat Kanan', org: 'SPRM Negeri Selangor' },
    { quote: 'Masa yang kami jimat dalam dokumentasi kini digunakan untuk menjalankan lebih banyak siasatan. Kapasiti unit kami meningkat 40% dalam masa 6 bulan.', name: 'TPR Rohana Kadir', role: 'Ketua Unit Siasatan', org: 'SPRM Wilayah Persekutuan' },
    { quote: 'Rakaman audio yang tersimpan automatik dalam perpustakaan sangat membantu semakan semula. Kami boleh dengar balik perbualan untuk pastikan fakta dalam laporan tepat sebelum dikemukakan kepada pendakwa raya.', name: 'TPR Azman Shafie', role: 'Pegawai Penyiasat', org: 'SPRM Negeri Johor' },
  ],
  doctor: [
    { quote: 'Nota SOAP automatik jimat saya 20 minit setiap pesakit. Dalam masa sebulan, saya dapat terima 40+ pesakit tambahan tanpa kerja lebih masa.', name: 'Dr. Farah Liyana Aziz', role: 'Medical Officer', org: 'Hospital Tengku Ampuan Rahimah, Klang' },
    { quote: 'Pengesanan krisis psikiatri masa nyata sangat berguna semasa konsultasi yang padat. AI kesan perkara yang mungkin saya terlepas pandang dalam konsultasi 10 minit.', name: 'Dr. Harith Syazwan', role: 'Pakar Psikiatri', org: 'KPJ Damansara Specialist Hospital' },
    { quote: 'Saya boleh tumpukan perhatian penuh kepada pesakit tanpa bimbang tentang nota. Maklum balas pesakit tentang kualiti konsultasi meningkat ketara.', name: 'Dr. Aishah Mohd Rodzi', role: 'Doktor Keluarga', org: 'Klinik Kesihatan Taman Melawati' },
  ],
  iso: [
    { quote: 'NCR dan CAR yang dijana VeriRec menepati standard ISO 19011. Kadar penutupan NCR kami naik dari 60% ke 94% dalam masa 3 bulan pertama penggunaan.', name: 'En. Farouk Ibrahim', role: 'Juruaudit Utama MS ISO 9001', org: 'Firma Perundingan Kualiti Nasional' },
    { quote: 'Dulu 3 jam untuk tulis laporan audit, sekarang 20 minit. Saya boleh uruskan dua kali lebih banyak audit dalam masa yang sama.', name: 'Pn. Kavitha Subramaniam', role: 'QMS Lead Auditor', org: 'SIRIM QAS International' },
    { quote: 'Tracking tindakan pembetulan dalam VeriRec memudahkan follow-up dengan auditee. Badan pensijilan kami sangat teruja dengan tahap dokumentasi kami.', name: 'En. Azrin Malik', role: 'Quality Manager', org: 'Pengilang Automotif Nasional' },
  ],
  hr: [
    { quote: 'Kes pemecatan salah laku yang kami kendalikan menggunakan VeriRec berjaya dipertahankan di Mahkamah Perusahaan. Dokumentasi kami tidak boleh dicabar.', name: 'Pn. Melissa Tan', role: 'CHRO', org: 'Syarikat Tersenarai Bursa Malaysia' },
    { quote: 'Inkuiri Domestik yang dulu ambil 2 minggu untuk siap dokumentasi, sekarang siap dalam 2 hari. Proses HR jadi lebih pantas dan telus untuk semua pihak.', name: 'En. Johari Kassim', role: 'HR Director', org: 'Kumpulan Syarikat GLC' },
    { quote: 'Rekod persetujuan PDPA dalam setiap sesi inkuiri jamin perlindungan syarikat dari segi undang-undang. Peguam syarikat kami mengesyorkan VeriRec.', name: 'Pn. Rosnani Hj. Yusof', role: 'HR Manager', org: 'Syarikat Pembinaan Nasional' },
  ],
  court: [
    { quote: 'Analisa keterangan saksi masa nyata membantu saya kesan percanggahan yang mungkin terlepas dalam pemeriksaan balas yang pantas. Kadar kemenangan kes saya meningkat.', name: 'Pn. Lim Siew Ling', role: 'Peguam Cara', org: 'Tetuan Lim & Partners, KL' },
    { quote: 'Dokumentasi prosiding yang lengkap dan tidak boleh diubah sangat membantu dalam kes rayuan. Mahkamah Rayuan menghargai rekod yang teratur dan telus.', name: 'En. Faizal Othman', role: 'Peguam Jenayah', org: 'Peguambela & Peguamcara' },
    { quote: 'Cadangan soalan pemeriksaan balas dari AI membantu saya bersedia dengan lebih baik sebelum prosiding. Masa persediaan saya berkurang separuh.', name: 'Pn. Aileen Kong', role: 'Peguambela & Peguamcara', org: 'Mahkamah Tinggi Kuala Lumpur' },
  ],
  peguam: [
    { quote: 'Laporan perundingan yang dijana VeriRec menjimatkan 2-3 jam kerja setiap hari. Saya boleh terima lebih banyak klien tanpa kompromi kualiti perkhidmatan.', name: 'Tuan Hafizuddin Aziz', role: 'Partner', org: 'Tetuan Hafiz & Associates, Petaling Jaya' },
    { quote: 'Analisa jurang kes masa nyata sangat berguna dalam kes kompleks. AI kesan perkara yang memerlukan penyiasatan lanjut sebelum kes difailkan.', name: 'Pn. Syazwani Latif', role: 'Peguamcara Sivil', org: 'Peguambela & Peguamcara Berdaftar' },
    { quote: 'Rekod perundingan yang selamat memberi klien keyakinan bahawa maklumat mereka dilindungi. Legal Professional Privilege terjaga sepenuhnya.', name: 'En. Bernard Yong', role: 'Peguam Hartanah & Korporat', org: 'Tetuan Yong & Co, Kuala Lumpur' },
  ],
  jkm: [
    { quote: 'Pengesanan petanda bahaya masa nyata memberi saya keyakinan semasa temubual sensitif. AI kesan "takut balik rumah" — kami dapat bertindak segera untuk selamatkan kanak-kanak itu.', name: 'Pn. Norhaslinda Bakar', role: 'Pegawai Kebajikan Kanan', org: 'JKM Selangor' },
    { quote: 'Laporan penilaian risiko yang lengkap membantu kes kami berjaya di mahkamah kebajikan. Hakim sangat menghargai dokumentasi yang teratur dan tidak boleh dimanipulasi.', name: 'En. Rashdan Yusof', role: 'Pegawai Kebajikan', org: 'JKM Wilayah Persekutuan KL' },
    { quote: 'Beban dokumentasi yang berkurangan bermakna saya ada lebih masa untuk keluarga yang memerlukan. Kualiti perkhidmatan kebajikan kami meningkat ketara.', name: 'Pn. Zaitun Mohd Noor', role: 'Ketua Unit Perlindungan Kanak-kanak', org: 'JKM Negeri Sembilan' },
  ],
};

const PLANS = [
  {
    key: 'free', label: 'Percuma', price: 0, sessions: 2, popular: false, trial: false,
    features: ['2 sesi/bulan', '1 pengguna', 'Transkripsi automatik', 'Laporan asas'],
    notIncluded: ['Analisa AI Realtime', 'Laporan PDF', 'Sokongan keutamaan'],
  },
  {
    key: 'starter', label: 'Profesional', price: 100, sessions: 20, popular: true, trial: false,
    features: ['20 sesi/bulan', 'AI analisis realtime', 'Panduan PEACE Model', 'Laporan SOP PDF', 'Diarisasi speaker', 'Top-up sesi bila perlu'],
    notIncluded: ['Pengguna tidak terhad', 'SLA 99.9%'],
  },
  {
    key: 'pro', label: 'Pro', price: 999, sessions: 100, popular: true, trial: false,
    features: ['100 sesi/bulan', '10 pengguna', 'Semua ciri Starter', 'Analisa AI 7 Profesion', 'Keutamaan sokongan', 'Akses API'],
    notIncluded: ['200+ sesi/bulan'],
  },
  {
    key: 'biz', label: 'Perniagaan', price: 2499, sessions: 200, popular: false, trial: false,
    features: ['200 sesi/bulan', 'Pengguna tidak terhad', 'Semua ciri Pro', 'Akaun terurus', 'SLA 99.9%', 'Onboarding khusus'],
    notIncluded: [],
  },
];

export default function ProfessionLandingPage({ professionSlug }) {
  const navigate = useNavigate();
  const [annual, setAnnual] = useState(false);
  const data = PROFESSIONS[professionSlug];

  if (!data) return null;

  const getMonthlyPrice = (plan) => annual ? Math.round(plan.price * 0.83) : plan.price;
  const getAnnualTotal  = (plan) => Math.round(plan.price * 10 * 0.83);

  const handleCta = () => {
    if (data.enterpriseCta) {
      window.location.href = 'mailto:hello@verirec.app?subject=Demo%20VeriRec%20' + encodeURIComponent(data.label);
      return;
    }
    localStorage.setItem('preferred_profession', professionSlug);
    navigate(`/auth?mode=register&profession=${professionSlug}`);
  };

  const handleLogin = () => navigate('/auth');

  const meta = PROFESSION_META[professionSlug] ?? {};
  const SLUG_TO_ROUTE = { counselor: 'kaunselor', police: 'polis', doctor: 'doktor', court: 'mahkamah' };
  const ogUrl = `${BASE_URL}/${SLUG_TO_ROUTE[professionSlug] ?? professionSlug}`;

  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>{meta.title}</title>
        <meta name="description" content={meta.desc} />
        <meta property="og:title" content={meta.title} />
        <meta property="og:description" content={meta.desc} />
        <meta property="og:url" content={ogUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content={`${BASE_URL}/pwa-512.svg`} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={meta.title} />
        <meta name="twitter:description" content={meta.desc} />
        <link rel="canonical" href={ogUrl} />
      </Helmet>

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur border-b px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button onClick={() => navigate('/home')} className="flex items-center gap-2">
            <Logo />
            <span className="font-bold text-gray-900 text-lg">VeriRec</span>
          </button>
          <div className="hidden sm:flex items-center gap-5 text-sm text-gray-600">
            <button onClick={() => navigate('/home')} className="hover:text-gray-900 transition-colors">← Semua Profesion</button>
            <a href="#masalah" className="hover:text-gray-900 transition-colors">Masalah</a>
            <a href="#ciri" className="hover:text-gray-900 transition-colors">Ciri-ciri</a>
            <a href="#harga" className="hover:text-gray-900 transition-colors">Harga</a>
            <a href="/faq" className="hover:text-gray-900 transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleLogin} className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Log Masuk</button>
            <button
              onClick={handleCta}
              className="text-sm font-semibold text-white px-4 py-2 rounded-lg transition-colors"
              style={{ backgroundColor: data.hex }}
            >
              {data.enterpriseCta ? 'Hubungi Kami' : 'Cuba Percuma'}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-24 px-6" style={{ background: `linear-gradient(to bottom, ${data.hex}08, white)` }}>
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full mb-6 border"
            style={{ backgroundColor: `${data.hex}15`, color: data.hex, borderColor: `${data.hex}30` }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: data.hex }} />
            {data.badge}
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 leading-tight mb-6">
            {data.headline}<br />
            <span style={{ color: data.hex }}>{data.headlineAccent}</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed">
            {data.sub}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleCta}
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 text-base font-semibold text-white rounded-xl transition-opacity hover:opacity-90 shadow-lg"
              style={{ backgroundColor: data.hex }}
            >
              {data.ctaText}
            </button>
            <button
              onClick={handleLogin}
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 text-base font-medium text-gray-700 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Log Masuk
            </button>
          </div>
          {!data.enterpriseCta && (
            <p className="text-xs text-gray-400 mt-4">Tanpa kad kredit · Batalkan bila-bila masa</p>
          )}
        </div>

        {/* Trust row */}
        <div className="max-w-3xl mx-auto mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'PDPA 2010', sub: 'Consent audit trail' },
            { label: 'SHA-256', sub: 'Chain of custody' },
            { label: 'Whisper AI', sub: 'Transkripsi tepat' },
            { label: 'Made in Malaysia', sub: 'Data stored locally' },
          ].map(b => (
            <div key={b.label} className="bg-white rounded-xl border p-4 text-center shadow-sm">
              <p className="font-bold text-gray-900 text-sm">{b.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{b.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pain Points */}
      <section id="masalah" className="py-20 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Masalah yang Kami Faham</h2>
            <p className="text-gray-500 mt-3">Sebagai {data.label}, anda hadapi cabaran unik yang alat biasa tidak dapat selesaikan.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {data.painPoints.map((p, i) => (
              <div key={i} className="bg-white rounded-2xl border p-6">
                <div className="text-3xl mb-3">{p.icon}</div>
                <h3 className="font-semibold text-gray-900 mb-2">{p.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="ciri" className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Direka Khusus untuk {data.label}</h2>
            <p className="text-gray-500 mt-3">Bukan sekadar alat rakaman biasa — platform yang memahami kerja anda.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {data.features.map((f, i) => (
              <div key={i} className="p-6 rounded-2xl border bg-white hover:shadow-md transition-shadow flex gap-4">
                <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-white text-sm font-bold"
                  style={{ backgroundColor: data.hex }}>
                  {i + 1}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{f.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      {TESTIMONIALS[professionSlug] && (
        <section className="py-20 px-6 bg-gray-50">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900">Kata Mereka</h2>
              <p className="text-gray-500 mt-3">Pengamal {data.label} yang telah menggunakan VeriRec.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {TESTIMONIALS[professionSlug].map((t, i) => (
                <div key={i} className="bg-white rounded-2xl border p-6 flex flex-col">
                  <div className="flex gap-0.5 mb-4">
                    {[...Array(5)].map((_, s) => (
                      <svg key={s} className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed flex-1 mb-5">"{t.quote}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                      style={{ backgroundColor: data.hex }}>
                      {t.name.split(' ').pop()[0]}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{t.name}</p>
                      <p className="text-xs text-gray-500">{t.role} · {t.org}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* How it works */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Mulakan dalam 3 Langkah</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {STEPS.map((s, i) => (
              <div key={i} className="text-center">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white font-bold text-lg"
                  style={{ backgroundColor: data.hex }}>
                  {s.num}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="harga" className="py-20 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900">Harga Mudah, Tiada Kejutan</h2>
            <p className="text-gray-500 mt-3">Mulakan percuma. Naik taraf bila anda bersedia.</p>

            {!data.enterpriseCta && (
              <div className="flex items-center justify-center gap-4 mt-6">
                <span className={`text-sm font-medium ${!annual ? 'text-gray-900' : 'text-gray-400'}`}>Bulanan</span>
                <button
                  onClick={() => setAnnual(!annual)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${annual ? 'bg-blue-600' : 'bg-gray-300'}`}
                  style={annual ? { backgroundColor: data.hex } : {}}
                >
                  <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${annual ? 'translate-x-6' : ''}`} />
                </button>
                <span className={`text-sm font-medium ${annual ? 'text-gray-900' : 'text-gray-400'}`}>
                  Tahunan <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full ml-1">Jimat 17%</span>
                </span>
              </div>
            )}
          </div>

          {data.enterpriseCta ? (
            <div className="text-center bg-white rounded-2xl border p-10 max-w-lg mx-auto">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Harga Khas untuk Institusi</h3>
              <p className="text-gray-500 mb-6">Kami menyediakan pakej khas untuk agensi kerajaan termasuk onboarding, latihan, dan sokongan SLA.</p>
              <button
                onClick={() => { window.location.href = 'mailto:hello@verirec.app?subject=Pertanyaan%20Harga%20Institusi'; }}
                className="px-8 py-3 font-semibold text-white rounded-xl hover:opacity-90 transition-opacity"
                style={{ backgroundColor: data.hex }}
              >
                Hubungi Kami untuk Demo
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {PLANS.map(plan => {
                const monthlyPrice = getMonthlyPrice(plan);
                return (
                  <div
                    key={plan.key}
                    className={`relative rounded-2xl border-2 p-6 flex flex-col bg-white ${plan.popular ? 'shadow-xl' : 'border-gray-200'}`}
                    style={plan.popular ? { borderColor: data.hex } : {}}
                  >
                    {plan.popular && (
                      <div
                        className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-white text-xs font-bold px-4 py-1.5 rounded-full whitespace-nowrap shadow"
                        style={{ backgroundColor: data.hex }}
                      >
                        Paling Popular
                      </div>
                    )}

                    <h3 className="text-lg font-bold text-gray-900">{plan.label}</h3>
                    <p className="text-xs text-gray-500 mt-0.5 mb-4">{plan.sessions} sesi/bulan</p>

                    <div className="mb-5">
                      {plan.price === 0 ? (
                        <p className="text-3xl font-bold text-gray-900">Percuma</p>
                      ) : (
                        <>
                          <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-bold text-gray-900">RM{monthlyPrice}</span>
                            <span className="text-gray-500 text-sm">/bulan</span>
                          </div>
                          {annual && (
                            <p className="text-xs text-gray-400 mt-0.5">Dibil RM{getAnnualTotal(plan)}/tahun</p>
                          )}
                        </>
                      )}
                    </div>

                    <ul className="space-y-2 mb-6 flex-1">
                      {plan.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                          <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          {f}
                        </li>
                      ))}
                      {plan.notIncluded.map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-400">
                          <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          {f}
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={() => plan.key === 'biz'
                        ? (window.location.href = 'mailto:hello@verirec.app?subject=Pertanyaan%20Pelan%20Perniagaan%20VeriRec')
                        : handleCta()
                      }
                      disabled={plan.key === 'free' && false}
                      className="w-full py-2.5 rounded-xl font-semibold text-sm transition-opacity hover:opacity-90"
                      style={plan.popular
                        ? { backgroundColor: data.hex, color: 'white' }
                        : { backgroundColor: 'transparent', color: data.hex, border: `1.5px solid ${data.hex}` }
                      }
                    >
                      {plan.key === 'free' ? 'Cuba Percuma' : plan.key === 'biz' ? 'Hubungi Kami' : 'Langgan Sekarang'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-20 px-6" style={{ backgroundColor: data.hex }}>
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            {data.enterpriseCta ? `Demo Percuma untuk ${data.label}` : `Mulakan Hari Ini — Percuma`}
          </h2>
          <p className="mb-8" style={{ color: 'rgba(255,255,255,0.8)' }}>
            {data.enterpriseCta
              ? 'Hubungi kami untuk demo langsung dan perbincangan keperluan institusi anda.'
              : '2 sesi percuma. Tiada kad kredit diperlukan. Batal bila-bila masa.'}
          </p>
          <button
            onClick={handleCta}
            className="inline-flex items-center justify-center gap-2 bg-white font-semibold rounded-xl px-10 py-3.5 text-base transition-colors hover:opacity-90"
            style={{ color: data.hex }}
          >
            {data.ctaText}
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 px-6 py-10">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <button onClick={() => navigate('/home')} className="flex items-center gap-2">
            <Logo />
            <span className="font-bold text-white">VeriRec</span>
            <span className="text-xs text-gray-500 ml-2">Platform Rakaman Sesi Profesional</span>
          </button>
          <div className="flex items-center gap-6 text-sm">
            <button onClick={() => navigate('/home')} className="hover:text-white transition-colors">Laman Utama</button>
            <button onClick={() => navigate('/faq')} className="hover:text-white transition-colors">FAQ</button>
            <button onClick={() => navigate('/pricing')} className="hover:text-white transition-colors">Harga</button>
            <button onClick={() => navigate('/terms')} className="hover:text-white transition-colors">Terma</button>
            <button onClick={() => navigate('/privacy')} className="hover:text-white transition-colors">Privasi</button>
            <a href="mailto:hello@verirec.app" className="hover:text-white transition-colors">Hubungi Kami</a>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-8 pt-6 border-t border-gray-800 text-center text-xs text-gray-600">
          © {new Date().getFullYear()} VeriRec. Dibina di Malaysia. Mematuhi PDPA 2010.
        </div>
      </footer>
    </div>
  );
}
