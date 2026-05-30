import { useNavigate } from 'react-router-dom';

const EFFECTIVE_DATE = '1 Jun 2026';
const EMAIL = 'hello@verirec.app';

const sections = [
  {
    id: 'dikumpul',
    title: '1. Maklumat yang Kami Kumpul',
    body: `Kami mengumpul maklumat berikut apabila anda menggunakan VeriRec:

Maklumat Akaun:
• Nama penuh, alamat e-mel, dan kata laluan (disulitkan)
• Maklumat organisasi atau agensi (jika berkenaan)
• Pilihan profesion dan tetapan akaun

Maklumat Sesi:
• Rakaman audio sesi (disimpan sementara untuk transkripsi)
• Transkrip teks yang dijana daripada rakaman
• Metadata sesi: tarikh, masa, tempoh, fasa, dan nota konteks
• Rekod persetujuan PDPA subjek yang ditemu bual

Maklumat Teknikal:
• Alamat IP, jenis pelayar, dan sistem pengendalian
• Log aktiviti untuk audit dan keselamatan
• Data penggunaan dan prestasi platform (tanpa maklumat peribadi)

Maklumat Pembayaran:
• Kami tidak menyimpan butiran kad kredit — diproses terus oleh Stripe
• Rekod transaksi dan sejarah langganan disimpan untuk tujuan perakaunan`,
  },
  {
    id: 'penggunaan',
    title: '2. Cara Kami Menggunakan Maklumat',
    body: `Kami menggunakan maklumat yang dikumpul untuk:

• Menyediakan dan menambah baik Perkhidmatan VeriRec
• Memproses rakaman audio melalui OpenAI Whisper untuk transkripsi
• Menganalisa kandungan sesi melalui Anthropic Claude AI untuk laporan dan cadangan
• Menguruskan langganan dan pembayaran melalui Stripe
• Menghantar e-mel berkaitan akaun (pengesahan, resit, notifikasi penting)
• Mengesan dan mencegah penipuan serta penyalahgunaan
• Mematuhi keperluan undang-undang dan peraturan yang berkenaan

Kami TIDAK menggunakan data sesi anda untuk:
• Melatih model AI (data anda tidak digunakan untuk latihan model)
• Pengiklanan atau pemasaran pihak ketiga
• Dijual kepada mana-mana pihak`,
  },
  {
    id: 'perkongsian',
    title: '3. Perkongsian Maklumat',
    body: `Kami berkongsi maklumat anda HANYA dengan pembekal perkhidmatan yang diperlukan untuk operasi platform:

Pembekal Perkhidmatan Teknikal:
• Supabase Inc. — pangkalan data dan pengesahan (pelayan di rantau Asia Pasifik)
• Anthropic PBC — analisa AI sesi (data diproses, tidak disimpan oleh Anthropic)
• OpenAI LLC — transkripsi audio Whisper (data diproses, tidak disimpan oleh OpenAI)
• Vercel Inc. — hosting dan pengagihan platform

Pembekal Pembayaran:
• Stripe Inc. — pemprosesan kad kredit/debit

Kami tidak berkongsi maklumat peribadi anda dengan pihak lain melainkan:
• Diwajibkan oleh undang-undang atau perintah mahkamah
• Diperlukan untuk melindungi hak, harta, atau keselamatan VeriRec atau pengguna lain
• Dengan persetujuan nyata anda`,
  },
  {
    id: 'penyimpanan',
    title: '4. Penyimpanan dan Keselamatan Data',
    body: `Lokasi Penyimpanan:
• Semua data disimpan di pelayan Supabase yang terletak di rantau Asia Pasifik
• Rakaman audio disimpan dalam storan terenkripsi dan dipadamkan selepas transkripsi selesai

Tempoh Penyimpanan:
• Data akaun: disimpan selagi akaun aktif + 30 hari selepas penamatan
• Laporan dan transkrip sesi: disimpan selagi akaun aktif
• Rekod persetujuan PDPA: disimpan secara KEKAL mengikut keperluan PDPA 2010 dan tidak boleh dipadam
• Log audit: disimpan selama 7 tahun mengikut amalan terbaik pematuhan

Langkah Keselamatan:
• Enkripsi data semasa transit (TLS 1.3) dan semasa rehat (AES-256)
• Hash SHA-256 untuk integriti laporan (chain of custody)
• Kawalan akses berasaskan peranan (Row Level Security)
• Pengesahan dua faktor tersedia untuk akaun sensitif`,
  },
  {
    id: 'hak',
    title: '5. Hak Anda di bawah PDPA 2010',
    body: `Di bawah Akta Perlindungan Data Peribadi 2010 (PDPA) Malaysia, anda mempunyai hak untuk:

• Akses — Meminta salinan data peribadi yang kami pegang tentang anda
• Pembetulan — Meminta kami membetulkan data yang tidak tepat atau tidak lengkap
• Pemadaman — Meminta kami memadam data peribadi anda (tertakluk kepada kewajipan undang-undang)
• Bantahan — Membantah pemprosesan data anda untuk tujuan pemasaran langsung
• Portabiliti — Meminta data anda dalam format yang boleh dibaca mesin

Untuk menggunakan mana-mana hak ini, sila hubungi kami di ${EMAIL}.
Kami akan membalas permintaan anda dalam masa 21 hari bekerja.

Nota: Rekod persetujuan PDPA subjek yang ditemu bual tidak boleh dipadam kerana ia merupakan bukti pematuhan undang-undang yang wajib dikekalkan.`,
  },
  {
    id: 'kuki',
    title: '6. Kuki dan Teknologi Penjejakan',
    body: `Kami menggunakan kuki dan storan tempatan untuk:

• Mengekalkan sesi log masuk anda (diperlukan untuk fungsi asas)
• Menyimpan pilihan sesi dan tetapan (storan sesi/tempatan)
• Memantau prestasi platform (data agregat tanpa maklumat peribadi)

Kami TIDAK menggunakan kuki pihak ketiga untuk pengiklanan atau penjejakan merentas laman web.

Anda boleh mematikan kuki dalam pelayar anda, tetapi ini mungkin menjejaskan fungsi platform.`,
  },
  {
    id: 'kanak',
    title: '7. Privasi Kanak-kanak',
    body: `Perkhidmatan VeriRec tidak ditujukan untuk pengguna bawah umur 18 tahun.

Bagi pegawai JKM dan profesional lain yang merakam sesi melibatkan kanak-kanak sebagai subjek temuduga:
• Persetujuan ibu bapa atau penjaga sah mesti diperoleh sebelum mana-mana rakaman
• Borang persetujuan VeriRec menyediakan ruangan khusus untuk persetujuan penjaga
• Data sesi melibatkan kanak-kanak dilindungi dengan tahap keselamatan yang sama seperti data dewasa`,
  },
  {
    id: 'perubahan',
    title: '8. Perubahan Polisi',
    body: `Kami mungkin mengemas kini Polisi Privasi ini dari semasa ke semasa. Perubahan material akan dimaklumkan melalui:
• E-mel kepada alamat berdaftar anda
• Notifikasi dalam platform

Tarikh "Berkuat kuasa" di bahagian atas halaman ini akan dikemas kini bagi mencerminkan versi terkini.
Penggunaan berterusan Perkhidmatan selepas perubahan berkuat kuasa dianggap sebagai penerimaan polisi yang dipinda.`,
  },
  {
    id: 'hubungi',
    title: '9. Hubungi Pegawai Privasi Kami',
    body: `Untuk sebarang pertanyaan, aduan, atau permintaan berkaitan privasi dan perlindungan data:

E-mel: ${EMAIL}
Subjek: [Pertanyaan Privasi] — penerangan ringkas isu anda

Kami komited untuk menyelesaikan sebarang kebimbangan privasi dengan serius dan tepat masa.
Jika anda tidak berpuas hati dengan respons kami, anda berhak untuk membuat aduan kepada Jabatan Perlindungan Data Peribadi (JPDP) Malaysia.`,
  },
];

export default function PrivacyPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b bg-gray-50">
        <div className="max-w-3xl mx-auto px-6 py-8">
          <button onClick={() => navigate('/home')} className="text-sm text-blue-600 hover:underline mb-4 block">
            ← Kembali ke Laman Utama
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Polisi Privasi</h1>
          <p className="text-gray-500 mt-2 text-sm">Berkuat kuasa: {EFFECTIVE_DATE} · Mematuhi PDPA 2010 Malaysia</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Intro */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 mb-10">
          <p className="text-sm text-green-800 leading-relaxed">
            VeriRec komited untuk melindungi privasi dan data peribadi anda. Polisi ini menerangkan bagaimana kami mengumpul,
            menggunakan, dan melindungi maklumat anda mengikut Akta Perlindungan Data Peribadi 2010 (PDPA) Malaysia.
          </p>
        </div>

        {/* Table of contents */}
        <div className="mb-10 p-5 bg-gray-50 rounded-xl border">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Kandungan</p>
          <ul className="space-y-1">
            {sections.map(s => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="text-sm text-blue-600 hover:underline">{s.title}</a>
              </li>
            ))}
          </ul>
        </div>

        {/* Sections */}
        <div className="space-y-10">
          {sections.map(s => (
            <section key={s.id} id={s.id}>
              <h2 className="text-lg font-bold text-gray-900 mb-3">{s.title}</h2>
              <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{s.body}</div>
            </section>
          ))}
        </div>

        {/* Footer links */}
        <div className="mt-12 pt-8 border-t flex flex-wrap gap-4 text-sm text-gray-500">
          <button onClick={() => navigate('/terms')} className="text-blue-600 hover:underline">Terma Perkhidmatan</button>
          <button onClick={() => navigate('/faq')} className="hover:text-gray-900">FAQ</button>
          <a href={`mailto:${EMAIL}`} className="hover:text-gray-900">{EMAIL}</a>
        </div>
      </div>
    </div>
  );
}
