import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';

const supabaseAnon = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);

const CONSENT_ITEMS = [
  'I understand that this counseling session will be conducted confidentially.',
  'I agree that session notes may be kept as part of my client file.',
  'I understand the limits of confidentiality (risk of harm, legal requirements).',
  'I consent to participate in this session voluntarily and may withdraw at any time.',
];

function InfoRow({ label, value }) {
  return (
    <div className="flex gap-3">
      <span className="text-sm text-gray-400 w-24 flex-shrink-0">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  );
}

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
  const [checked, setChecked] = useState([false, false, false, false]);
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
  if (status === 'done') return <StatusPage icon="✅" title="Consent Recorded" desc="Your consent has been digitally recorded. You may close this page." color="green" />;
  if (status === 'error') return <StatusPage icon="⚠️" title="Something went wrong" desc="Please try again or contact your counselor." />;

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </div>
            <span className="font-bold text-gray-900">Kaunselor</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900">Informed Consent Form</h1>
          <p className="text-gray-500 mt-2 text-sm">Please read carefully and provide your consent below.</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
          <div className="space-y-3 mb-6">
            {record.subject_name && <InfoRow label="Client" value={record.subject_name} />}
            {record.counselor_name && <InfoRow label="Counselor" value={record.counselor_name} />}
            {record.purpose && <InfoRow label="Purpose" value={record.purpose} />}
          </div>
          <div className="border-t pt-5 space-y-4">
            {CONSENT_ITEMS.map((item, i) => (
              <label key={i} className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checked[i]}
                  onChange={e => setChecked(prev => prev.map((v, idx) => idx === i ? e.target.checked : v))}
                  className="mt-0.5 w-4 h-4 accent-violet-600 flex-shrink-0"
                />
                <span className="text-sm text-gray-700 leading-relaxed">{item}</span>
              </label>
            ))}
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!allChecked || submitting}
          className="w-full py-4 bg-violet-600 text-white font-bold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:bg-violet-700 transition-colors text-sm"
        >
          {submitting ? 'Submitting...' : 'I Consent — Proceed'}
        </button>
        <p className="text-xs text-center text-gray-400 mt-3">
          Your consent is digitally timestamped and stored securely.
        </p>
      </div>
    </div>
  );
}
