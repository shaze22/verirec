import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';

const supabaseAnon = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);

const CONSENT_SECTIONS = [
  {
    title: 'Nature of Counseling Services',
    body: 'Counseling is a professional relationship that empowers individuals to achieve mental health, well-being, education, and career goals. Your counselor will work collaboratively with you to explore concerns, set goals, and develop strategies for positive change. Counseling is not a substitute for medical treatment, and the outcomes depend on active participation and honest communication.',
    label: 'I have read and understood the nature of counseling services offered.',
  },
  {
    title: 'Confidentiality',
    body: 'All information shared during your counseling sessions is strictly confidential. Session notes, records, and any personal information will not be disclosed to any third party without your explicit written consent. Your counselor is bound by the Malaysian Counselors Act 1998 (Act 580) and the ethical guidelines of Lembaga Kaunselor Malaysia (LKM).',
    label: 'I understand that my personal information is confidential and protected by professional ethics and law.',
  },
  {
    title: 'Limits of Confidentiality',
    body: 'There are specific circumstances where confidentiality must be broken in accordance with Malaysian law and professional duty of care:\n• If you disclose an intent to harm yourself or others\n• If there is reasonable suspicion of abuse involving a child, elderly person, or vulnerable individual\n• If required by a court order or other legal obligation\n• If your counselor seeks professional supervision (all identifying information will be anonymized)',
    label: 'I understand the circumstances under which confidentiality may be lawfully breached.',
  },
  {
    title: 'Session Documentation & AI Technology',
    body: 'This counseling platform uses AI-assisted transcription technology to support session documentation and professional record-keeping. This means your session may be audio-recorded and transcribed using artificial intelligence. All AI-generated transcripts are reviewed by your counselor. Session data is encrypted, stored securely, and accessed only by authorised personnel. You may request a copy of or deletion of your session records at any time.',
    label: 'I consent to AI-assisted transcription being used for session documentation purposes.',
  },
  {
    title: 'Your Rights as a Client',
    body: 'As a client, you have the following rights:\n• To ask questions about the counseling process, your counselor\'s qualifications, or any aspect of your care at any time\n• To withdraw your consent and discontinue counseling services at any time without penalty\n• To request referral to another professional if you feel the current service is not suitable\n• To access your session records upon written request\n• To file a complaint with Lembaga Kaunselor Malaysia if you believe your rights have been violated',
    label: 'I acknowledge my rights as a client and understand how to exercise them.',
  },
  {
    title: 'Personal Data Protection (PDPA)',
    body: 'Your personal data — including name, contact details, and session records — is collected and processed in accordance with Malaysia\'s Personal Data Protection Act 2010 (PDPA). Your data is used solely for the purpose of providing counseling services, retained only for as long as professionally required, and will not be sold or transferred to third parties without your consent.',
    label: 'I understand how my personal data is collected, used, and protected under the PDPA.',
  },
  {
    title: 'Voluntary Participation & Withdrawal',
    body: 'Your participation in counseling is entirely voluntary. You may withdraw your consent, pause, or terminate services at any time without consequence. If you choose to withdraw, your counselor will discuss referral options and ensure continuity of care where appropriate. Withdrawal does not affect access to any previously rendered services.',
    label: 'I confirm that I am participating voluntarily and understand my right to withdraw at any time.',
  },
];

function StatusPage({ icon, title, desc, color = 'gray' }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="text-5xl mb-4">{icon}</div>
        <h1 className={`text-2xl font-black mb-2 ${color === 'green' ? 'text-green-700' : 'text-gray-900'}`}>{title}</h1>
        <p className="text-gray-500">{desc}</p>
      </div>
    </div>
  );
}

export default function PublicCounselorConsentPage() {
  const { token } = useParams();
  const [record, setRecord] = useState(null);
  const [status, setStatus] = useState('loading');
  const [checked, setChecked] = useState(Array(CONSENT_SECTIONS.length).fill(false));
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) { setStatus('invalid'); return; }
    supabaseAnon
      .from('counselor_consent_requests')
      .select('id, subject_name, counselor_name, purpose, consent_given, expires_at')
      .eq('token', token)
      .single()
      .then(({ data, error }) => {
        if (error || !data) { setStatus('invalid'); return; }
        if (data.consent_given) { setStatus('done'); return; }
        if (new Date(data.expires_at) < new Date()) { setStatus('expired'); return; }
        setRecord(data);
        setStatus('ready');
      });
  }, [token]);

  const allChecked = checked.every(Boolean);

  const handleSubmit = async () => {
    if (!allChecked) return;
    setSubmitting(true);
    try {
      const { error } = await supabaseAnon
        .from('counselor_consent_requests')
        .update({ consent_given: true, consented_at: new Date().toISOString() })
        .eq('token', token);
      if (error) throw error;
      setStatus('done');
    } catch {
      setStatus('error');
    } finally {
      setSubmitting(false);
    }
  };

  if (status === 'loading') return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (status === 'invalid') return <StatusPage icon="❌" title="Invalid Link" desc="This consent link is invalid or does not exist." />;
  if (status === 'expired') return <StatusPage icon="⏰" title="Link Expired" desc="This consent link has expired. Please contact your counselor for a new link." />;
  if (status === 'done') return <StatusPage icon="✅" title="Consent Recorded" desc="Your informed consent has been digitally recorded and timestamped. You may close this page." color="green" />;
  if (status === 'error') return <StatusPage icon="⚠️" title="Something went wrong" desc="Please try again or contact your counselor." />;

  const consentDate = new Date().toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-9 h-9 bg-violet-600 rounded-xl flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </div>
            <span className="font-bold text-gray-900 text-lg">Kaunselor</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900">Informed Consent for Counseling Services</h1>
          <p className="text-gray-500 mt-2 text-sm">Please read each section carefully before providing your consent.</p>
        </div>

        {/* Client Details */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-5">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Session Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {record.subject_name && (
              <div className="flex gap-2">
                <span className="text-sm text-gray-400 w-24 flex-shrink-0">Client</span>
                <span className="text-sm font-semibold text-gray-900">{record.subject_name}</span>
              </div>
            )}
            {record.counselor_name && (
              <div className="flex gap-2">
                <span className="text-sm text-gray-400 w-24 flex-shrink-0">Counselor</span>
                <span className="text-sm font-semibold text-gray-900">{record.counselor_name}</span>
              </div>
            )}
            {record.purpose && (
              <div className="flex gap-2 sm:col-span-2">
                <span className="text-sm text-gray-400 w-24 flex-shrink-0">Purpose</span>
                <span className="text-sm font-semibold text-gray-900">{record.purpose}</span>
              </div>
            )}
            <div className="flex gap-2 sm:col-span-2">
              <span className="text-sm text-gray-400 w-24 flex-shrink-0">Date</span>
              <span className="text-sm font-semibold text-gray-900">{consentDate}</span>
            </div>
          </div>
        </div>

        {/* Consent Sections */}
        <div className="space-y-4 mb-6">
          {CONSENT_SECTIONS.map((section, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-5 pt-5 pb-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </span>
                  <h3 className="text-sm font-bold text-gray-900">{section.title}</h3>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{section.body}</p>
              </div>
              <label className={`flex items-start gap-3 px-5 py-3 cursor-pointer border-t transition-colors ${
                checked[i] ? 'bg-violet-50 border-violet-100' : 'bg-gray-50 border-gray-100 hover:bg-violet-50'
              }`}>
                <input
                  type="checkbox"
                  checked={checked[i]}
                  onChange={e => setChecked(prev => prev.map((v, idx) => idx === i ? e.target.checked : v))}
                  className="mt-0.5 w-4 h-4 accent-violet-600 flex-shrink-0"
                />
                <span className={`text-sm leading-snug select-none ${checked[i] ? 'text-violet-800 font-medium' : 'text-gray-700'}`}>
                  {section.label}
                </span>
              </label>
            </div>
          ))}
        </div>

        {/* Progress indicator */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">Consent progress</span>
            <span className="text-xs font-semibold text-violet-700">{checked.filter(Boolean).length} / {CONSENT_SECTIONS.length} sections</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className="bg-violet-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(checked.filter(Boolean).length / CONSENT_SECTIONS.length) * 100}%` }}
            />
          </div>
          {!allChecked && (
            <p className="text-xs text-gray-400 mt-2">Please confirm all sections above before submitting.</p>
          )}
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!allChecked || submitting}
          className="w-full py-4 bg-violet-600 text-white font-bold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:bg-violet-700 active:scale-[0.99] transition-all text-sm"
        >
          {submitting ? 'Recording consent...' : 'I Have Read and Consent to All Terms — Submit'}
        </button>

        <p className="text-xs text-center text-gray-400 mt-3 leading-relaxed">
          By submitting, your digital consent is recorded with a timestamp and stored securely.<br />
          This form is governed by the Malaysian Counselors Act 1998 (Act 580) and PDPA 2010.
        </p>
      </div>
    </div>
  );
}
