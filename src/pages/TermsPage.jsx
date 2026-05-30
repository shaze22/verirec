import { useNavigate } from 'react-router-dom';

const EFFECTIVE_DATE = '1 Jun 2026';
const COMPANY = 'VeriRec';
const EMAIL = 'hello@verirec.app';

const sections = [
  {
    id: 'penerimaan',
    title: '1. Penerimaan Terma',
    body: `Dengan mendaftar atau menggunakan platform VeriRec ("Perkhidmatan"), anda bersetuju untuk terikat dengan Terma Perkhidmatan ini. Jika anda tidak bersetuju dengan mana-mana bahagian terma ini, anda tidak dibenarkan menggunakan Perkhidmatan kami.

Terma ini terpakai kepada semua pengguna, termasuk pelawat, pengguna berdaftar, dan pelanggan berbayar.`,
  },
  {
    id: 'perkhidmatan',
    title: '2. Penerangan Perkhidmatan',
    body: `VeriRec adalah platform rakaman dan analitik sesi temuduga profesional untuk pengamal di Malaysia, termasuk kaunselor, pegawai polis, pegawai SPRM, pengamal perubatan, juruaudit ISO, penyiasat HR, pegawai mahkamah, peguam, dan pegawai kebajikan masyarakat.

Perkhidmatan kami merangkumi:
• Rakaman dan transkripsi sesi secara automatik
• Analisa AI masa nyata semasa sesi
• Jana laporan berstruktur dengan chain of custody SHA-256
• Penyimpanan rekod persetujuan PDPA
• Pengurusan kes dan subjek`,
  },
  {
    id: 'akaun',
    title: '3. Akaun Pengguna',
    body: `Anda bertanggungjawab untuk:
• Memastikan maklumat pendaftaran adalah tepat dan terkini
• Menjaga kerahsiaan kata laluan akaun anda
• Semua aktiviti yang berlaku di bawah akaun anda
• Memberitahu kami serta-merta jika terdapat penggunaan tanpa kebenaran

Anda mesti berumur sekurang-kurangnya 18 tahun untuk menggunakan Perkhidmatan ini. Akaun tidak boleh dikongsi antara individu yang berbeza.`,
  },
  {
    id: 'langganan',
    title: '4. Langganan dan Pembayaran',
    body: `VeriRec menawarkan pelan Percuma dan pelan berbayar (Starter, Pro, Perniagaan).

Pembayaran:
• Bayaran diproses melalui Stripe (kad kredit/debit)
• Langganan diperbaharui secara automatik setiap bulan melainkan dibatalkan
• Harga ditunjukkan dalam Ringgit Malaysia (RM) tidak termasuk cukai berkenaan
• Tiada bayaran balik untuk tempoh langganan yang telah berlalu

Pelan Percuma:
• Pelan Percuma menawarkan 2 sesi sebulan tanpa caj
• Naik taraf pada bila-bila masa untuk mendapatkan lebih banyak sesi dan ciri premium

Pembatalan:
• Anda boleh membatalkan langganan pada bila-bila masa melalui halaman Tetapan
• Akses kepada ciri berbayar berterusan sehingga akhir tempoh bil semasa`,
  },
  {
    id: 'penggunaan',
    title: '5. Penggunaan yang Dibenarkan',
    body: `Anda bersetuju untuk tidak:
• Menggunakan Perkhidmatan untuk tujuan yang menyalahi undang-undang Malaysia
• Merakam sesi tanpa persetujuan yang sah daripada semua pihak yang terlibat
• Berkongsi kelayakan akaun dengan pihak yang tidak dibenarkan
• Cuba mengakses sistem atau data pengguna lain
• Memuat naik kandungan yang mengandungi perisian hasad atau kod berbahaya
• Menggunakan Perkhidmatan untuk menyimpan atau memproses maklumat terperingkat keselamatan negara

Penggunaan Profesional:
Anda bertanggungjawab sepenuhnya untuk memastikan pematuhan dengan perundangan profesional dan etika yang terpakai kepada profesion anda, termasuk keperluan persetujuan rekod di bawah PDPA 2010.`,
  },
  {
    id: 'data',
    title: '6. Data dan Privasi',
    body: `Penggunaan Perkhidmatan kami tertakluk kepada Polisi Privasi kami yang merupakan sebahagian daripada Terma ini.

Data rakaman dan transkrip sesi anda:
• Disimpan secara selamat di pelayan Supabase (rantau Asia Pasifik)
• Tidak dikongsi dengan pihak ketiga melainkan seperti yang dinyatakan dalam Polisi Privasi
• Diproses oleh model AI Anthropic Claude dan OpenAI Whisper untuk tujuan transkripsi dan analisa sahaja
• Rekod persetujuan PDPA disimpan secara kekal dan tidak boleh dipadam mengikut keperluan undang-undang

Anda mengekalkan pemilikan penuh ke atas data sesi anda.`,
  },
  {
    id: 'ip',
    title: '7. Hak Harta Intelek',
    body: `VeriRec dan semua kandungan, ciri, dan fungsi platform (termasuk antaramuka, reka bentuk, teks, grafik, dan logo) adalah milik eksklusif ${COMPANY} dan dilindungi oleh undang-undang hak cipta Malaysia.

Anda diberikan lesen terhad, tidak eksklusif, dan tidak boleh dipindah milik untuk menggunakan Perkhidmatan bagi tujuan perniagaan anda sendiri.

Kandungan yang anda hasilkan menggunakan Perkhidmatan (laporan, transkrip, rakaman) adalah milik anda sepenuhnya.`,
  },
  {
    id: 'had',
    title: '8. Had Tanggungjawab',
    body: `Perkhidmatan disediakan "sebagaimana adanya" tanpa sebarang waranti, sama ada tersurat atau tersirat.

${COMPANY} tidak bertanggungjawab ke atas:
• Kehilangan data akibat kegagalan teknikal di luar kawalan kami
• Keputusan profesional atau undang-undang yang dibuat berdasarkan analisa AI kami — analisa AI adalah panduan sokongan sahaja
• Gangguan perkhidmatan sementara akibat penyelenggaraan atau isu infrastruktur
• Kerugian tidak langsung, sampingan, atau berbangkit

Had liabiliti maksimum kami tidak melebihi jumlah yang anda bayar kepada kami dalam tempoh 3 bulan sebelum tuntutan.`,
  },
  {
    id: 'penamatan',
    title: '9. Penamatan',
    body: `Kami berhak untuk menggantung atau menamatkan akaun anda jika anda melanggar Terma ini, termasuk penggunaan yang menyalahi undang-undang atau percubaan untuk mengakses sistem kami secara tidak sah.

Selepas penamatan:
• Akses kepada Perkhidmatan akan ditarik serta-merta
• Data anda akan disimpan selama 30 hari sebelum dipadam, kecuali rekod persetujuan PDPA yang disimpan secara kekal mengikut undang-undang
• Bayaran yang telah dibuat tidak akan dikembalikan`,
  },
  {
    id: 'undangundang',
    title: '10. Undang-undang Terpakai',
    body: `Terma ini ditadbir oleh dan ditafsirkan mengikut undang-undang Malaysia. Sebarang pertikaian yang timbul daripada atau berkaitan dengan Terma ini hendaklah diselesaikan di mahkamah Malaysia yang mempunyai bidang kuasa.

Perundangan berkaitan yang terpakai termasuk:
• Akta Perlindungan Data Peribadi 2010 (PDPA)
• Akta Komunikasi dan Multimedia 1998
• Akta Kontrak 1950`,
  },
  {
    id: 'perubahan',
    title: '11. Perubahan Terma',
    body: `Kami berhak untuk mengubah Terma ini pada bila-bila masa. Perubahan material akan dimaklumkan melalui e-mel atau notifikasi dalam platform sekurang-kurangnya 14 hari sebelum berkuat kuasa.

Penggunaan berterusan Perkhidmatan selepas perubahan berkuat kuasa dianggap sebagai penerimaan terma yang dipinda.`,
  },
  {
    id: 'hubungi',
    title: '12. Hubungi Kami',
    body: `Jika anda mempunyai sebarang soalan tentang Terma Perkhidmatan ini, sila hubungi kami:

E-mel: ${EMAIL}
Laman web: https://verirec.app`,
  },
];

export default function TermsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b bg-gray-50">
        <div className="max-w-3xl mx-auto px-6 py-8">
          <button onClick={() => navigate('/home')} className="text-sm text-blue-600 hover:underline mb-4 block">
            ← Kembali ke Laman Utama
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Terma Perkhidmatan</h1>
          <p className="text-gray-500 mt-2 text-sm">Berkuat kuasa: {EFFECTIVE_DATE} · Bahasa: Bahasa Malaysia</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Intro */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-10">
          <p className="text-sm text-blue-800 leading-relaxed">
            Sila baca Terma Perkhidmatan ini dengan teliti sebelum menggunakan platform VeriRec.
            Dengan menggunakan perkhidmatan kami, anda bersetuju untuk terikat dengan terma-terma berikut.
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
          <button onClick={() => navigate('/privacy')} className="text-blue-600 hover:underline">Polisi Privasi</button>
          <button onClick={() => navigate('/faq')} className="hover:text-gray-900">FAQ</button>
          <a href={`mailto:${EMAIL}`} className="hover:text-gray-900">{EMAIL}</a>
        </div>
      </div>
    </div>
  );
}
