import { useNavigate } from 'react-router-dom';

const EFFECTIVE_DATE = '1 June 2026';
const COMPANY = 'VeriRec';
const EMAIL = 'hello@verirec.app';

const sections = [
  {
    id: 'penerimaan',
    title: '1. Acceptance of Terms',
    body: `By registering for or using the VeriRec platform ("Service"), you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, you are not permitted to use our Service.

These terms apply to all users, including visitors, registered users, and paying subscribers.`,
  },
  {
    id: 'perkhidmatan',
    title: '2. Service Description',
    body: `VeriRec is a professional interview session recording and analytics platform for practitioners in Malaysia, including counselors, police officers, MACC officers, medical practitioners, ISO auditors, HR investigators, court officers, lawyers, and social welfare officers.

Our Service includes:
• Automatic session recording and transcription
• Real-time AI analysis during sessions
• Generation of structured reports with SHA-256 chain of custody
• Storage of PDPA consent records
• Case and subject management`,
  },
  {
    id: 'akaun',
    title: '3. User Accounts',
    body: `You are responsible for:
• Ensuring that your registration information is accurate and up to date
• Maintaining the confidentiality of your account password
• All activities that occur under your account
• Notifying us immediately of any unauthorised use of your account

You must be at least 18 years of age to use this Service. Accounts may not be shared between different individuals.`,
  },
  {
    id: 'langganan',
    title: '4. Subscriptions and Payment',
    body: `VeriRec offers a Free plan and paid plans (Starter, Pro, Business).

Payment:
• Payments are processed via Stripe (credit/debit card)
• Subscriptions renew automatically on a monthly basis unless cancelled
• Prices are displayed in Malaysian Ringgit (RM) and exclude applicable taxes
• No refunds are available for subscription periods that have already elapsed

Free Plan:
• The Free Plan offers 2 sessions per month at no charge
• Upgrade at any time to access more sessions and premium features

Cancellation:
• You may cancel your subscription at any time via the Settings page
• Access to paid features continues until the end of the current billing period`,
  },
  {
    id: 'penggunaan',
    title: '5. Acceptable Use Policy',
    body: `You agree not to:
• Use the Service for any purpose that contravenes Malaysian law
• Record sessions without valid consent from all parties involved
• Share account credentials with unauthorised parties
• Attempt to access the systems or data of other users
• Upload content containing malware or malicious code
• Use the Service to store or process nationally classified security information

Professional Use:
You are solely responsible for ensuring compliance with the professional legislation and ethical standards applicable to your profession, including consent record requirements under the PDPA 2010.`,
  },
  {
    id: 'data',
    title: '6. Data and Privacy',
    body: `Your use of our Service is subject to our Privacy Policy, which forms part of these Terms.

Your session recording and transcript data:
• Is stored securely on Supabase servers (Asia Pacific region)
• Is not shared with third parties except as stated in the Privacy Policy
• Is processed by Anthropic Claude and OpenAI Whisper AI models for transcription and analysis purposes only
• PDPA consent records are retained permanently and cannot be deleted as required by law

You retain full ownership of your session data.`,
  },
  {
    id: 'ip',
    title: '7. Intellectual Property',
    body: `VeriRec and all platform content, features, and functionality (including the interface, design, text, graphics, and logos) are the exclusive property of ${COMPANY} and are protected by Malaysian copyright law.

You are granted a limited, non-exclusive, and non-transferable licence to use the Service for your own professional purposes.

Content you generate using the Service (reports, transcripts, recordings) belongs entirely to you.`,
  },
  {
    id: 'had',
    title: '8. Limitation of Liability',
    body: `The Service is provided "as is" without any warranty, whether express or implied.

${COMPANY} is not liable for:
• Data loss arising from technical failures beyond our control
• Professional or legal decisions made based on our AI analysis — AI analysis is intended as a supporting guide only
• Temporary service interruptions due to maintenance or infrastructure issues
• Indirect, incidental, or consequential losses

Our maximum liability shall not exceed the amount you have paid to us in the 3 months preceding the claim.`,
  },
  {
    id: 'penamatan',
    title: '9. Termination',
    body: `We reserve the right to suspend or terminate your account if you breach these Terms, including unlawful use or attempts to access our systems without authorisation.

Upon termination:
• Access to the Service will be revoked immediately
• Your data will be retained for 30 days before deletion, except for PDPA consent records which are retained permanently as required by law
• Payments already made will not be refunded`,
  },
  {
    id: 'undangundang',
    title: '10. Governing Law',
    body: `These Terms are governed by and construed in accordance with the laws of Malaysia. Any dispute arising from or in connection with these Terms shall be resolved in the Malaysian courts with appropriate jurisdiction.

Relevant legislation that applies includes:
• Personal Data Protection Act 2010 (PDPA)
• Communications and Multimedia Act 1998
• Contracts Act 1950`,
  },
  {
    id: 'perubahan',
    title: '11. Changes to Terms',
    body: `We reserve the right to modify these Terms at any time. Material changes will be communicated via email or in-platform notification at least 14 days before taking effect.

Continued use of the Service after changes take effect shall be deemed acceptance of the revised terms.`,
  },
  {
    id: 'hubungi',
    title: '12. Contact Us',
    body: `If you have any questions regarding these Terms of Service, please contact us:

Email: ${EMAIL}
Website: https://verirec.app`,
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
            ← Back to Home
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Terms of Service</h1>
          <p className="text-gray-500 mt-2 text-sm">Effective date: {EFFECTIVE_DATE} · Governed by Malaysian Law</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Intro */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-10">
          <p className="text-sm text-blue-800 leading-relaxed">
            Please read these Terms of Service carefully before using the VeriRec platform.
            By using our Service, you agree to be bound by the following terms.
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
          <button onClick={() => navigate('/privacy')} className="text-blue-600 hover:underline">Privacy Policy</button>
          <button onClick={() => navigate('/faq')} className="hover:text-gray-900">FAQ</button>
          <a href={`mailto:${EMAIL}`} className="hover:text-gray-900">{EMAIL}</a>
        </div>
      </div>
    </div>
  );
}
