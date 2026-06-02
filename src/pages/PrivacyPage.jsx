import { useNavigate } from 'react-router-dom';

const EFFECTIVE_DATE = '1 June 2026';
const EMAIL = 'hello@verirec.app';

const sections = [
  {
    id: 'dikumpul',
    title: '1. Information We Collect',
    body: `We collect the following information when you use VeriRec:

Account Information:
• Full name, email address, and password (encrypted)
• Organisation or agency information (where applicable)
• Profession preferences and account settings

Session Information:
• Audio recordings of sessions (stored temporarily for transcription)
• Text transcripts generated from recordings
• Session metadata: date, time, duration, phase, and context notes
• PDPA consent records of interviewed subjects

Technical Information:
• IP address, browser type, and operating system
• Activity logs for audit and security purposes
• Platform usage and performance data (no personal information)

Payment Information:
• We do not store credit card details — processed directly by Stripe
• Transaction records and subscription history are retained for accounting purposes`,
  },
  {
    id: 'penggunaan',
    title: '2. How We Use Your Information',
    body: `We use the information collected to:

• Provide and improve the VeriRec Service
• Process audio recordings via OpenAI Whisper for transcription
• Analyse session content via Anthropic Claude AI for reports and recommendations
• Manage subscriptions and payments via Stripe
• Send account-related emails (verification, receipts, important notifications)
• Detect and prevent fraud and misuse
• Comply with applicable legal and regulatory requirements

We do NOT use your session data to:
• Train AI models (your data is not used for model training)
• Third-party advertising or marketing
• Sell to any party`,
  },
  {
    id: 'perkongsian',
    title: '3. Information Sharing',
    body: `We share your information ONLY with service providers necessary for platform operations:

Technical Service Providers:
• Supabase Inc. — database and authentication (servers in Asia Pacific region)
• Anthropic PBC — AI session analysis (data is processed, not stored by Anthropic)
• OpenAI LLC — Whisper audio transcription (data is processed, not stored by OpenAI)
• Vercel Inc. — platform hosting and delivery

Payment Provider:
• Stripe Inc. — credit/debit card processing

We do not share your personal information with any other parties unless:
• Required by law or court order
• Necessary to protect the rights, property, or safety of VeriRec or other users
• With your explicit consent`,
  },
  {
    id: 'penyimpanan',
    title: '4. Data Retention and Security',
    body: `Storage Location:
• All data is stored on Supabase servers located in the Asia Pacific region
• Audio recordings are stored in encrypted storage and deleted after transcription is complete

Retention Periods:
• Account data: retained while the account is active + 30 days after termination
• Session reports and transcripts: retained while the account is active
• PDPA consent records: retained PERMANENTLY as required by PDPA 2010 and cannot be deleted
• Audit logs: retained for 7 years in accordance with compliance best practices

Security Measures:
• Encryption in transit (TLS 1.3) and at rest (AES-256)
• SHA-256 hashing for report integrity (chain of custody)
• Role-based access control (Row Level Security)
• Two-factor authentication available for sensitive accounts`,
  },
  {
    id: 'hak',
    title: '5. Your Rights under PDPA 2010',
    body: `Under the Personal Data Protection Act 2010 (PDPA) of Malaysia, you have the right to:

• Access — Request a copy of the personal data we hold about you
• Correction — Request that we correct inaccurate or incomplete data
• Erasure — Request that we delete your personal data (subject to legal obligations)
• Objection — Object to the processing of your data for direct marketing purposes
• Portability — Request your data in a machine-readable format

To exercise any of these rights, please contact us at ${EMAIL}.
We will respond to your request within 21 business days.

Note: PDPA consent records of interviewed subjects cannot be deleted as they constitute legally required evidence of compliance.`,
  },
  {
    id: 'kuki',
    title: '6. Cookies and Tracking Technologies',
    body: `We use cookies and local storage to:

• Maintain your login session (required for core functionality)
• Store session preferences and settings (session/local storage)
• Monitor platform performance (aggregated data with no personal information)

We do NOT use third-party cookies for advertising or cross-site tracking.

You may disable cookies in your browser, but this may affect platform functionality.`,
  },
  {
    id: 'kanak',
    title: "7. Children's Privacy",
    body: `The VeriRec Service is not intended for users under the age of 18.

For JKM officers and other professionals who record sessions involving children as interview subjects:
• Parental or legal guardian consent must be obtained before any recording
• VeriRec consent forms include a dedicated field for guardian consent
• Session data involving children is protected with the same level of security as adult data`,
  },
  {
    id: 'perubahan',
    title: '8. Changes to This Policy',
    body: `We may update this Privacy Policy from time to time. Material changes will be communicated via:
• Email to your registered address
• In-platform notification

The "Effective date" at the top of this page will be updated to reflect the latest version.
Continued use of the Service after changes take effect constitutes acceptance of the revised policy.`,
  },
  {
    id: 'hubungi',
    title: '9. Contact Our Privacy Officer',
    body: `For any questions, complaints, or requests regarding privacy and data protection:

Email: ${EMAIL}
Subject: [Privacy Enquiry] — brief description of your issue

We are committed to addressing any privacy concerns seriously and promptly.
If you are not satisfied with our response, you have the right to lodge a complaint with the Department of Personal Data Protection (JPDP) Malaysia.`,
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
            ← Back to Home
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
          <p className="text-gray-500 mt-2 text-sm">Effective date: {EFFECTIVE_DATE} · Compliant with PDPA 2010 Malaysia</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Intro */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 mb-10">
          <p className="text-sm text-green-800 leading-relaxed">
            VeriRec is committed to protecting your privacy and personal data. This policy explains how we collect,
            use, and safeguard your information in accordance with the Personal Data Protection Act 2010 (PDPA) Malaysia.
          </p>
        </div>

        {/* Table of contents */}
        <div className="mb-10 p-5 bg-gray-50 rounded-xl border">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Contents</p>
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
          <button onClick={() => navigate('/terms')} className="text-blue-600 hover:underline">Terms of Service</button>
          <button onClick={() => navigate('/faq')} className="hover:text-gray-900">FAQ</button>
          <a href={`mailto:${EMAIL}`} className="hover:text-gray-900">{EMAIL}</a>
        </div>
      </div>
    </div>
  );
}
