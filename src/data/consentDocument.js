// Bilingual (BM + EN) informed-consent document for counseling sessions.
// Designed to meet global standards (APA, ACA, BACP, GDPR informed consent)
// AND exceed Malaysian requirements (Akta Kaunselor 1998 / Act 580, Lembaga
// Kaunselor Malaysia ethics, PDPA 2010).
//
// Each section may set requiresAck:true — the client must tick that clause
// explicitly. A drawn signature at the end seals the whole document.
// {counselor} and {client} placeholders are filled at render time.

export const CONSENT_VERSION = '2026.1';

export const CRISIS_RESOURCES = [
  { label: 'Talian Kasih', value: '15999 / WhatsApp 019-2615999' },
  { label: 'Befrienders KL', value: '03-7627 2929 (24 jam)' },
  { label: 'Emergency / Kecemasan', value: '999' },
];

export const CONSENT_SECTIONS = [
  {
    id: 'nature',
    requiresAck: false,
    icon: '🤝',
    title: { en: 'About Counseling', ms: 'Tentang Kaunseling' },
    body: {
      en: 'You are entering a voluntary, collaborative counseling relationship with {counselor}. Counseling is a process that may explore difficult thoughts and emotions. Outcomes vary between individuals and no specific result is guaranteed. You may ask questions about the counselor’s qualifications, methods, or registration with Lembaga Kaunselor Malaysia (LKM) at any time.',
      ms: 'Anda memasuki hubungan kaunseling secara sukarela dan kolaboratif bersama {counselor}. Kaunseling ialah satu proses yang mungkin menyentuh fikiran dan emosi yang sukar. Hasilnya berbeza bagi setiap individu dan tiada keputusan tertentu yang dijamin. Anda boleh bertanya tentang kelayakan, kaedah, atau pendaftaran kaunselor dengan Lembaga Kaunselor Malaysia (LKM) pada bila-bila masa.',
    },
  },
  {
    id: 'confidentiality',
    requiresAck: true,
    icon: '🔒',
    title: { en: 'Confidentiality', ms: 'Kerahsiaan' },
    body: {
      en: 'What you share is kept strictly confidential. Your records, notes, and personal information will not be disclosed to any third party without your written consent, in accordance with the Counsellors Act 1998 (Act 580) and the LKM Code of Ethics.',
      ms: 'Apa yang anda kongsi disimpan secara sulit. Rekod, nota, dan maklumat peribadi anda tidak akan didedahkan kepada pihak ketiga tanpa kebenaran bertulis anda, selaras dengan Akta Kaunselor 1998 (Akta 580) dan Kod Etika LKM.',
    },
  },
  {
    id: 'limits',
    requiresAck: true,
    icon: '⚠️',
    title: { en: 'Limits to Confidentiality', ms: 'Had Kerahsiaan' },
    body: {
      en: 'Confidentiality has legal and ethical limits. Your counselor may disclose information without consent only when: (a) there is an imminent risk of serious harm to you or another identifiable person (duty to warn and protect); (b) there is reasonable suspicion of abuse or neglect of a child or vulnerable adult (mandatory reporting); (c) disclosure is ordered by a court of law; or (d) for professional clinical supervision, where your identity is kept anonymous wherever possible. Where safe and practical, your counselor will discuss any disclosure with you first.',
      ms: 'Kerahsiaan mempunyai had dari segi undang-undang dan etika. Kaunselor anda boleh mendedahkan maklumat tanpa kebenaran hanya apabila: (a) terdapat risiko bahaya serius yang mendesak kepada anda atau individu lain yang boleh dikenal pasti (tanggungjawab memberi amaran dan melindungi); (b) terdapat syak munasabah penderaan atau pengabaian kanak-kanak atau dewasa terdedah (pelaporan wajib); (c) pendedahan diperintahkan oleh mahkamah; atau (d) untuk penyeliaan klinikal profesional, di mana identiti anda dirahsiakan sebaik mungkin. Jika selamat dan praktikal, kaunselor akan membincangkan sebarang pendedahan dengan anda terlebih dahulu.',
    },
  },
  {
    id: 'recording_ai',
    requiresAck: true,
    icon: '🎙️',
    title: { en: 'Recording & AI Processing', ms: 'Rakaman & Pemprosesan AI' },
    body: {
      en: 'With your consent, this session may be audio-recorded and processed by automated tools to produce a transcript, clinical notes, and to flag possible risk indicators. AI processing assists — but does not replace — your counselor’s professional judgment. Recordings and transcripts are handled as confidential clinical records under this agreement.',
      ms: 'Dengan kebenaran anda, sesi ini mungkin dirakam audio dan diproses oleh alat automatik untuk menghasilkan transkrip, nota klinikal, dan menanda kemungkinan petunjuk risiko. Pemprosesan AI membantu — tetapi tidak menggantikan — pertimbangan profesional kaunselor anda. Rakaman dan transkrip dikendalikan sebagai rekod klinikal sulit di bawah perjanjian ini.',
    },
  },
  {
    id: 'data',
    requiresAck: true,
    icon: '🛡️',
    title: { en: 'Data Protection & Cross-Border Processing', ms: 'Perlindungan Data & Pemprosesan Rentas Sempadan' },
    body: {
      en: 'Your personal data is collected and processed under Malaysia’s Personal Data Protection Act 2010 (PDPA), aligned with international standards (GDPR). Data is encrypted, used solely to provide your care, retained only as long as professionally and legally required, and never sold. To enable transcription and AI analysis, recordings/transcripts may be processed by trusted technology providers whose servers may be located outside Malaysia; this cross-border processing is bound by confidentiality safeguards. You have the right to access, correct, or withdraw your data, subject to records the counselor must retain by law.',
      ms: 'Data peribadi anda dikumpul dan diproses di bawah Akta Perlindungan Data Peribadi 2010 (PDPA) Malaysia, selaras dengan standard antarabangsa (GDPR). Data disulitkan, digunakan semata-mata untuk penjagaan anda, disimpan hanya selama yang diperlukan dari segi profesional dan undang-undang, dan tidak sekali-kali dijual. Untuk membolehkan transkripsi dan analisis AI, rakaman/transkrip mungkin diproses oleh penyedia teknologi yang dipercayai yang pelayannya mungkin terletak di luar Malaysia; pemprosesan rentas sempadan ini terikat dengan perlindungan kerahsiaan. Anda berhak mengakses, membetulkan, atau menarik balik data anda, tertakluk kepada rekod yang wajib disimpan oleh kaunselor di sisi undang-undang.',
    },
  },
  {
    id: 'rights',
    requiresAck: false,
    icon: '✊',
    title: { en: 'Your Rights', ms: 'Hak Anda' },
    body: {
      en: 'You may: ask questions at any time; withdraw consent and stop counseling at any time without penalty; request referral to another professional; access your records upon written request; and lodge a complaint with Lembaga Kaunselor Malaysia if you believe your rights have been breached.',
      ms: 'Anda boleh: bertanya pada bila-bila masa; menarik balik kebenaran dan menghentikan kaunseling pada bila-bila masa tanpa penalti; meminta rujukan kepada profesional lain; mengakses rekod anda atas permintaan bertulis; dan membuat aduan kepada Lembaga Kaunselor Malaysia jika anda percaya hak anda dilanggar.',
    },
  },
  {
    id: 'crisis',
    requiresAck: false,
    icon: '🆘',
    title: { en: 'In a Crisis', ms: 'Ketika Krisis' },
    body: {
      en: 'Counseling is not an emergency service. If you are in immediate danger or thinking of harming yourself, please contact a crisis line or emergency services right away.',
      ms: 'Kaunseling bukan perkhidmatan kecemasan. Jika anda dalam bahaya segera atau memikirkan untuk mencederakan diri, sila hubungi talian krisis atau perkhidmatan kecemasan dengan segera.',
    },
  },
  {
    id: 'consent',
    requiresAck: true,
    icon: '✍️',
    title: { en: 'Consent & Acknowledgment', ms: 'Kebenaran & Pengakuan' },
    body: {
      en: 'I confirm that this consent was explained to me, I had the opportunity to ask questions, and I understand and agree to all of the above. I give my informed consent to proceed with counseling, including audio recording and AI-assisted documentation as described.',
      ms: 'Saya mengesahkan bahawa kebenaran ini telah dijelaskan kepada saya, saya berpeluang bertanya soalan, dan saya memahami serta bersetuju dengan semua perkara di atas. Saya memberikan kebenaran termaklum saya untuk meneruskan kaunseling, termasuk rakaman audio dan dokumentasi berbantukan AI seperti yang diterangkan.',
    },
  },
];

export const CONSENT_UI = {
  readAloudHint: {
    en: 'Read each section aloud to your client, then have them tick to acknowledge and sign below.',
    ms: 'Bacakan setiap seksyen kepada klien anda, kemudian minta mereka menanda untuk mengaku dan menandatangani di bawah.',
  },
  ackLabel: {
    en: 'I have read / had this read to me and I understand',
    ms: 'Saya telah baca / dibacakan dan saya faham',
  },
  signTitle: { en: 'Client Signature', ms: 'Tandatangan Klien' },
  fullName: { en: 'Full name', ms: 'Nama penuh' },
  icNumber: { en: 'IC / Passport no. (optional)', ms: 'No. IC / Pasport (pilihan)' },
  minorToggle: { en: 'Client is a minor — signed by parent/guardian', ms: 'Klien bawah umur — ditandatangani ibu bapa/penjaga' },
  guardianName: { en: 'Guardian full name', ms: 'Nama penuh penjaga' },
  guardianRel: { en: 'Relationship to client', ms: 'Hubungan dengan klien' },
};
