import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Button } from '../components/ui/Button.jsx';

const faqs = [
  {
    q: 'Adakah VeriRec mematuhi Akta Perlindungan Data Peribadi (PDPA) 2010?',
    a: 'Ya. VeriRec direka khusus untuk pematuhan PDPA Malaysia. Setiap sesi memerlukan borang persetujuan maklum (informed consent) yang ditandatangani secara digital, dengan cap masa, versi, dan audit trail yang tidak boleh dipadam. Data persetujuan disimpan secara kekal sebagai rekod pematuhan.',
  },
  {
    q: 'Di mana data rakaman dan transkrip saya disimpan?',
    a: 'Semua data disimpan di pelayan Supabase yang terletak di rantau Asia Pasifik (Singapore). Data dienkripsi semasa penghantaran (TLS 1.3) dan semasa penyimpanan. Tiada data dihantar keluar dari infrastruktur yang selamat ini.',
  },
  {
    q: 'Apakah itu hash SHA-256 dan bagaimana ia berfungsi?',
    a: 'Setiap laporan yang dijana oleh VeriRec mempunyai cap digital unik (SHA-256 hash) yang dikira daripada kandungan laporan dan transkrip. Jika sesiapa cuba mengubah laporan selepas ia dijana, hash akan berubah dan pengesahan akan gagal. Ini membuktikan keaslian dokumen — penting untuk bukti mahkamah dan siasatan rasmi.',
  },
  {
    q: 'Bolehkah saya memadam rakaman dan data sesi?',
    a: 'Ya, anda boleh memadam sesi dari papan pemuka. Namun, data persetujuan (consent) tidak boleh dipadam — ini adalah keperluan PDPA untuk mengekalkan rekod persetujuan secara kekal. Audio rakaman boleh dipadam secara berasingan jika diperlukan.',
  },
  {
    q: 'Apakah format audio yang disokong?',
    a: 'VeriRec menggunakan MediaRecorder API yang secara automatik memilih format terbaik untuk peranti anda — WebM/Opus untuk Chrome/Android, MP4/AAC untuk Safari/iOS. Anda tidak perlu tetapkan apa-apa secara manual.',
  },
  {
    q: 'Adakah VeriRec berfungsi tanpa sambungan internet?',
    a: 'Ya, sebahagiannya. Anda boleh merekod dan melihat transkrip secara offline. Data sesi disimpan secara tempatan (IndexedDB) dan akan disegerakkan ke pelayan apabila sambungan dipulihkan. Walau bagaimanapun, penjanaan laporan AI memerlukan sambungan internet.',
  },
  {
    q: 'Boleh saya eksport laporan dalam format lain?',
    a: 'Ya. Laporan boleh dicetak terus dari browser atau dieksport sebagai PDF. Eksport PDF menggunakan format A4 dan termasuk semua maklumat laporan termasuk hash SHA-256 untuk pengesahan.',
  },
  {
    q: 'Berapa lama untuk berhenti langgan?',
    a: 'Anda boleh batalkan langganan pada bila-bila masa dari halaman Tetapan. Pembatalan berkuat kuasa pada akhir tempoh bil semasa — anda masih boleh guna semua ciri hingga tarikh tamat.',
  },
  {
    q: 'Adakah VeriRec sesuai untuk digunakan dalam mahkamah?',
    a: 'VeriRec direka untuk memudahkan dokumentasi profesional. Hash SHA-256 berfungsi sebagai bukti integriti dokumen. Walau bagaimanapun, penerimaan sebagai bukti mahkamah bergantung kepada peraturan mahkamah Malaysia dan kes-kes tertentu. Sila dapatkan nasihat peguam untuk kes khusus.',
  },
  {
    q: 'Bagaimana untuk menghubungi sokongan teknikal?',
    a: 'Hantar e-mel kepada hello@verirec.app atau gunakan borang hubungi di bawah. Masa tindak balas biasa adalah dalam 24 jam pada hari bekerja. Pelanggan Business mendapat sokongan keutamaan dengan masa tindak balas dalam 4 jam.',
  },
];

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-200 last:border-0">
      <button
        className="w-full text-left py-5 flex items-start justify-between gap-4 group"
        onClick={() => setOpen(!open)}
      >
        <span className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">{q}</span>
        <span className={`flex-shrink-0 mt-0.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>
      {open && <p className="pb-5 text-gray-600 leading-relaxed text-sm">{a}</p>}
    </div>
  );
}

export default function FaqPage() {
  const navigate = useNavigate();
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' });
  const [sent, setSent] = useState(false);

  const handleContact = (e) => {
    e.preventDefault();
    window.location.href = `mailto:hello@verirec.app?subject=Pertanyaan daripada ${contactForm.name}&body=${encodeURIComponent(contactForm.message)}%0A%0ADaripada: ${contactForm.name} (${contactForm.email})`;
    setSent(true);
  };

  return (
    <>
    <Helmet>
      <title>Soalan Lazim — VeriRec</title>
      <meta name="description" content="Jawapan kepada soalan lazim tentang VeriRec — pematuhan PDPA, keselamatan data, transkrip, rakaman audio, dan pelan harga." />
      <link rel="canonical" href="https://verirec.vercel.app/faq" />
      <meta property="og:type" content="website" />
      <meta property="og:url" content="https://verirec.vercel.app/faq" />
      <meta property="og:title" content="Soalan Lazim — VeriRec" />
      <meta property="og:description" content="Jawapan kepada soalan lazim tentang VeriRec — pematuhan PDPA, keselamatan data, transkrip, dan pelan harga." />
      <meta property="og:image" content="https://verirec.vercel.app/pwa-512.svg" />
    </Helmet>
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <button onClick={() => navigate('/')} className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="w-8 h-8">
            <rect width="32" height="32" rx="8" fill="#2563eb"/>
            <polyline points="4,16 7,11 10,21 13,9 16,23 19,11 22,18 25,14 28,16"
              stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          </svg>
          <span className="font-bold text-gray-900">VeriRec</span>
        </button>
        <Button size="sm" onClick={() => navigate('/auth')}>Log Masuk</Button>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900">Soalan Lazim</h1>
          <p className="text-gray-500 mt-3">Jawapan kepada soalan yang paling kerap ditanya tentang VeriRec</p>
        </div>

        <div className="bg-white rounded-2xl border p-6 mb-12">
          {faqs.map((faq, i) => <FaqItem key={i} q={faq.q} a={faq.a} />)}
        </div>

        {/* Contact */}
        <div className="bg-white rounded-2xl border p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Masih ada soalan?</h2>
          <p className="text-gray-500 text-sm mb-6">Hubungi kami dan kami akan balas dalam masa 24 jam.</p>

          {sent ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">✓</div>
              <p className="font-medium text-gray-900">Mesej anda telah dihantar.</p>
              <p className="text-sm text-gray-500 mt-1">Kami akan balas ke e-mel anda dalam masa 24 jam.</p>
            </div>
          ) : (
            <form onSubmit={handleContact} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nama</label>
                  <input
                    type="text" required
                    value={contactForm.name}
                    onChange={e => setContactForm(p => ({ ...p, name: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nama penuh anda"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">E-mel</label>
                  <input
                    type="email" required
                    value={contactForm.email}
                    onChange={e => setContactForm(p => ({ ...p, email: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="alamat@email.com"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mesej</label>
                <textarea
                  required rows={4}
                  value={contactForm.message}
                  onChange={e => setContactForm(p => ({ ...p, message: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Tulis soalan atau pertanyaan anda di sini..."
                />
              </div>
              <Button type="submit" className="w-full sm:w-auto">Hantar Mesej</Button>
            </form>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
