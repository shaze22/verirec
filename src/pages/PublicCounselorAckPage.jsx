import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { createClient } from '@supabase/supabase-js';

const supabaseAnon = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);

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

export default function PublicCounselorAckPage() {
  const { token } = useParams();
  const [record, setRecord] = useState(null);
  const [status, setStatus] = useState('loading');
  const [corrections, setCorrections] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) { setStatus('invalid'); return; }
    supabaseAnon
      .from('counselor_session_acks')
      .select('id, client_name, session_summary, acknowledged, expires_at, created_at')
      .eq('token', token)
      .single()
      .then(({ data, error }) => {
        if (error || !data) { setStatus('invalid'); return; }
        if (new Date(data.expires_at) < new Date()) { setStatus('expired'); return; }
        if (data.acknowledged) { setStatus('done'); return; }
        setRecord(data);
        setStatus('ready');
      });
  }, [token]);

  const handleAcknowledge = async () => {
    setSubmitting(true);
    try {
      const { error } = await supabaseAnon
        .from('counselor_session_acks')
        .update({
          acknowledged: true,
          acknowledged_at: new Date().toISOString(),
          corrections: corrections.trim() || null,
        })
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
  if (status === 'invalid') return <StatusPage icon="❌" title="Invalid Link" desc="This link is invalid or does not exist." />;
  if (status === 'expired') return <StatusPage icon="⏰" title="Link Expired" desc="This link has expired. Please contact your counselor." />;
  if (status === 'error') return <StatusPage icon="⚠️" title="Something went wrong" desc="Please try again." />;
  if (status === 'done') return (
    <StatusPage icon="✅" title="Session Acknowledged" desc="Your acknowledgement has been recorded. You may close this page." color="green" />
  );

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </div>
            <span className="font-bold text-gray-900">Kaunselor</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900">Session Acknowledgement</h1>
          <p className="text-gray-500 mt-2 text-sm">Please review your session summary and acknowledge its accuracy.</p>
        </div>

        {/* Session info */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="font-bold text-gray-900">{record.client_name}</h2>
              <p className="text-sm text-gray-500 mt-1">
                Session created {format(new Date(record.created_at), 'd MMM yyyy')}
              </p>
            </div>
            <div className="flex items-center gap-1.5 bg-violet-50 border border-violet-200 rounded-lg px-3 py-1.5 flex-shrink-0">
              <svg className="w-3.5 h-3.5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span className="text-xs font-semibold text-violet-700">Confidential</span>
            </div>
          </div>
        </div>

        {/* Session summary */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-5">
          <h3 className="font-bold text-gray-900 mb-3">Session Summary</h3>
          {record.session_summary ? (
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{record.session_summary}</p>
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">No summary available for this session.</p>
          )}
        </div>

        {/* Corrections */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-5">
          <h3 className="font-semibold text-gray-900 mb-1">
            Corrections or Comments
            <span className="text-gray-400 font-normal text-sm ml-1">(optional)</span>
          </h3>
          <p className="text-xs text-gray-400 mb-3">If anything in the summary is inaccurate, note it here. This will be recorded alongside your acknowledgement.</p>
          <textarea
            value={corrections}
            onChange={e => setCorrections(e.target.value)}
            rows={3}
            placeholder="Add any corrections or comments..."
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
          />
        </div>

        <button
          onClick={handleAcknowledge}
          disabled={submitting}
          className="w-full py-4 bg-violet-600 text-white font-bold rounded-xl disabled:opacity-40 hover:bg-violet-700 transition-colors text-sm"
        >
          {submitting ? 'Submitting...' : 'I Acknowledge This Session Summary'}
        </button>
        <p className="text-xs text-center text-gray-400 mt-3">
          Your acknowledgement is digitally timestamped. This does not constitute a legal admission.
        </p>
      </div>
    </div>
  );
}
