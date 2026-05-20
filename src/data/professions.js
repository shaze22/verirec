export const PROFESSIONS = [
  {
    id: 'counselor',
    label: 'Kaunselor',
    icon: '💬',
    color: '#10b981',
    frameworks: ['CBT', 'Pendekatan Person-Centered', 'Terapi Solusi Ringkas'],
    phases: ['Pembinaan Hubungan', 'Penilaian', 'Penerokaan', 'Intervensi', 'Penamatan'],
    questions: {
      'Pembinaan Hubungan': [
        'Apakah yang membawa anda ke sini hari ini?',
        'Sejak bila anda merasakan keadaan ini?',
        'Adakah ini kali pertama anda mendapatkan bantuan kaunseling?',
      ],
      'Penilaian': [
        'Bagaimana perasaan anda secara keseluruhannya dalam seminggu ini?',
        'Adakah anda mengalami masalah tidur atau selera makan?',
        'Adakah anda mempunyai sebarang pemikiran untuk menyakiti diri sendiri?',
        'Bagaimana hubungan anda dengan keluarga dan rakan-rakan?',
      ],
      'Penerokaan': [
        'Ceritakan lebih lanjut tentang situasi yang menyebabkan anda berasa begini.',
        'Apakah pemikiran yang sering bermain dalam fikiran anda?',
        'Bagaimana anda biasanya mengatasi tekanan?',
      ],
      'Intervensi': [
        'Apakah matlamat yang ingin anda capai melalui kaunseling ini?',
        'Apakah sumber kekuatan yang anda ada?',
        'Siapakah yang anda boleh hubungi ketika memerlukan sokongan?',
      ],
      'Penamatan': [
        'Apakah perubahan yang anda rasa berlaku sejak sesi pertama?',
        'Adakah anda bersedia untuk menghadapi cabaran seterusnya?',
        'Apakah rancangan anda untuk mengekalkan kemajuan ini?',
      ],
    },
    redFlagKeywords: ['bunuh diri', 'mati', 'sakiti diri', 'tidak mahu hidup', 'dera', 'keganasan'],
  },
  {
    id: 'police',
    label: 'Polis',
    icon: '👮',
    color: '#3b82f6',
    frameworks: ['PEACE Model', 'Cognitive Interview', 'Reid Technique'],
    phases: ['Pra-Temuduga', 'Pembukaan', 'Penerokaan Bebas', 'Penyoalan', 'Penutup'],
    questions: {
      'Pra-Temuduga': [
        'Sila nyatakan nama penuh, nombor kad pengenalan dan alamat anda.',
        'Adakah anda faham mengapa anda ditemuduga hari ini?',
        'Adakah anda memerlukan peguam atau jurubahasa?',
      ],
      'Pembukaan': [
        'Saya akan merakam perbualan ini untuk tujuan siasatan. Adakah anda bersetuju?',
        'Sila ceritakan apa yang berlaku pada [tarikh/masa] dalam perkataan anda sendiri.',
        'Mulakan dari mana anda mahu bermula.',
      ],
      'Penerokaan Bebas': [
        'Teruskan — apa yang berlaku selepas itu?',
        'Siapa lagi yang ada di sana ketika itu?',
        'Di manakah tepat anda berada semasa kejadian itu?',
      ],
      'Penyoalan': [
        'Anda menyebut [X] — boleh anda terangkan dengan lebih lanjut?',
        'Apakah yang anda lakukan antara [masa A] dan [masa B]?',
        'Apakah hubungan anda dengan [nama]?',
        'Adakah terdapat saksi yang boleh mengesahkan perkara ini?',
      ],
      'Penutup': [
        'Adakah terdapat sebarang maklumat lain yang anda ingin tambah?',
        'Adakah penyata yang anda berikan adalah benar dan tepat?',
        'Saya akan membacakan semula penyata anda. Sila dengar dengan teliti.',
      ],
    },
    redFlagKeywords: ['ancaman', 'senjata', 'bom', 'bunuh', 'ugut', 'paksa'],
  },
  {
    id: 'sprm',
    label: 'SPRM/MACC',
    icon: '⚖️',
    color: '#8b5cf6',
    frameworks: ['Skim Rasuah', 'FIAU Guidelines', 'UNCAC'],
    phases: ['Pemberitahuan Hak', 'Maklumat Latar Belakang', 'Penerokaan Kes', 'Dokumentasi', 'Penutup'],
    questions: {
      'Pemberitahuan Hak': [
        'Anda mempunyai hak untuk mendapatkan peguam. Adakah anda ingin menggunakan hak ini?',
        'Adakah anda faham bahawa anda tidak perlu menjawab soalan yang boleh membebani diri anda?',
        'Sesi ini dirakam mengikut Seksyen 17 SPRM 2009.',
      ],
      'Maklumat Latar Belakang': [
        'Apakah jawatan dan tanggungjawab rasmi anda?',
        'Berapa lama anda memegang jawatan ini?',
        'Siapakah ketua jabatan atau penyelia anda?',
      ],
      'Penerokaan Kes': [
        'Ceritakan tentang kontrak [X] yang melibatkan syarikat [Y].',
        'Apakah proses yang anda ikuti dalam kelulusan perolehan ini?',
        'Adakah anda pernah menerima apa-apa manfaat daripada pihak berkaitan?',
        'Siapakah yang membuat keputusan muktamad dalam perkara ini?',
      ],
      'Dokumentasi': [
        'Adakah terdapat dokumen bertulis berkaitan keputusan ini?',
        'Di mana dokumen-dokumen tersebut disimpan?',
        'Siapakah lagi yang mempunyai akses kepada rekod ini?',
      ],
      'Penutup': [
        'Adakah terdapat perkara lain yang anda ingin dedahkan secara sukarela?',
        'Penyata ini akan dikemukakan kepada pendakwa raya. Adakah anda faham?',
      ],
    },
    redFlagKeywords: ['rasuah', 'sogokan', 'kickback', 'salah guna kuasa', 'penyelewengan', 'pecah amanah'],
  },
  {
    id: 'doctor',
    label: 'Doktor',
    icon: '🏥',
    color: '#ef4444',
    frameworks: ['SOAP Note', 'Calgary-Cambridge Guide', 'HEADSS Assessment'],
    phases: ['Pembukaan', 'Sejarah Penyakit', 'Kajian Sistem', 'Penilaian Psikososial', 'Penutup'],
    questions: {
      'Pembukaan': [
        'Apakah masalah utama yang membawa anda ke sini hari ini?',
        'Sejak bila masalah ini bermula?',
        'Bagaimana keadaan ini mempengaruhi kehidupan harian anda?',
      ],
      'Sejarah Penyakit': [
        'Di manakah lokasi sakit/simptom tersebut?',
        'Bagaimana anda huraikan kualiti sakit itu — tajam, tumpul, berdenyut?',
        'Pada skala 0-10, berapa teruk sakitnya?',
        'Apakah yang membuatkan keadaan bertambah baik atau buruk?',
        'Adakah terdapat simptom lain yang berkaitan?',
      ],
      'Kajian Sistem': [
        'Bagaimana selera makan anda kebelakangan ini?',
        'Adakah anda mengalami sebarang perubahan berat badan?',
        'Adakah anda mengambil sebarang ubat atau suplemen?',
        'Adakah anda mempunyai sebarang alahan?',
      ],
      'Penilaian Psikososial': [
        'Bagaimana keadaan tekanan kerja/keluarga anda?',
        'Adakah anda merokok atau mengambil alkohol?',
        'Siapakah yang menyokong anda di rumah?',
      ],
      'Penutup': [
        'Adakah terdapat soalan atau kebimbangan lain yang anda ingin bincangkan?',
        'Saya akan jelaskan diagnosis dan rancangan rawatan seterusnya.',
        'Apakah tahap kefahaman anda tentang penjagaan susulan yang diperlukan?',
      ],
    },
    redFlagKeywords: ['bunuh diri', 'menyakiti diri', 'keganasan', 'penderaan', 'overdos'],
  },
  {
    id: 'iso',
    label: 'Juruaudit ISO',
    icon: '📋',
    color: '#f59e0b',
    frameworks: ['ISO 9001:2015', 'ISO 19011:2018', 'PDCA Cycle'],
    phases: ['Mesyuarat Pembukaan', 'Penilaian Dokumentasi', 'Temu Bual', 'Pemerhatian', 'Mesyuarat Penutup'],
    questions: {
      'Mesyuarat Pembukaan': [
        'Sila terangkan skop sistem pengurusan kualiti organisasi ini.',
        'Siapakah wakil pengurusan untuk sistem MS ini?',
        'Adakah terdapat sebarang perubahan ketara sejak audit terakhir?',
      ],
      'Penilaian Dokumentasi': [
        'Di manakah Polisi Kualiti organisasi ini didokumentasikan dan dikomunikasikan?',
        'Bagaimana anda mengawal dokumen-dokumen terkawal?',
        'Tunjukkan rekod kawalan yang paling terkini.',
      ],
      'Temu Bual': [
        'Apakah objektif kualiti jabatan ini untuk tahun semasa?',
        'Bagaimana anda menilai kepuasan pelanggan?',
        'Apakah proses yang anda ikuti apabila terdapat ketidakpatuhan?',
        'Berikan contoh tindakan pembetulan yang berjaya dilaksanakan.',
      ],
      'Pemerhatian': [
        'Tunjukkan kepada saya bagaimana proses ini dilaksanakan.',
        'Siapakah yang bertanggungjawab untuk langkah ini?',
        'Apakah rekod yang dihasilkan daripada proses ini?',
      ],
      'Mesyuarat Penutup': [
        'Adakah anda mempunyai sebarang soalan tentang penemuan yang dibentangkan?',
        'Bilakah tarikh sasaran untuk tindakan pembetulan?',
        'Adakah anda bersetuju dengan penemuan yang dicatatkan?',
      ],
    },
    redFlagKeywords: ['penipuan', 'pemalsuan', 'rekod palsu', 'tidak mematuhi'],
  },
  {
    id: 'hr',
    label: 'HR/Penyiasat',
    icon: '👔',
    color: '#6366f1',
    frameworks: ['Siasatan Dalaman', 'Prosedur Tatatertib', 'EA 1955'],
    phases: ['Taklimat Awal', 'Siasatan Aduan', 'Pengesahan Fakta', 'Penyata Penutup', 'Cadangan'],
    questions: {
      'Taklimat Awal': [
        'Apakah jawatan anda dan berapa lama anda bekerja di sini?',
        'Anda menerima surat panggilan siasatan. Adakah anda memahami tujuan siasatan ini?',
        'Adakah anda ingin diwakili oleh wakil kesatuan sekerja?',
      ],
      'Siasatan Aduan': [
        'Ceritakan tentang insiden yang berlaku pada [tarikh].',
        'Apakah hubungan kerja anda dengan pelapor atau pihak yang terlibat?',
        'Adakah ini kali pertama insiden seperti ini berlaku?',
      ],
      'Pengesahan Fakta': [
        'Adakah terdapat saksi yang melihat atau mendengar apa yang berlaku?',
        'Adakah terdapat bukti bertulis, mesej atau rakaman yang berkaitan?',
        'Siapakah yang anda hubungi selepas insiden ini berlaku?',
        'Apakah versi peristiwa anda berbanding dengan dakwaan yang dibuat?',
      ],
      'Penyata Penutup': [
        'Adakah terdapat maklumat tambahan yang anda ingin berikan?',
        'Adakah anda mahu membuat sebarang penjelasan tentang perkara yang dibincangkan?',
      ],
      'Cadangan': [
        'Apakah cadangan anda untuk mengelakkan insiden seperti ini berlaku semula?',
        'Adakah anda ingin menarik balik atau mengubah mana-mana penyata anda?',
      ],
    },
    redFlagKeywords: ['ugutan', 'buli', 'gangguan seksual', 'diskriminasi', 'suap', 'ancaman'],
  },
];

export function getProfession(id) {
  return PROFESSIONS.find(p => p.id === id);
}
