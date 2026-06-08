import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { createClient } from '@supabase/supabase-js';

const supabaseAnon = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
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

export default function PublicStatementPage() {
  const { token } = useParams();
  const [record, setRecord] = useState(null);
  const [session, setSession] = useState(null);
  const [status, setStatus] = useState('loading');
  const [corrections, setCorrections] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) { setStatus('invalid'); return; }
    supabaseAnon
      .from('statement_acknowledgements')
      .select('id, session_id, subject_name, acknowledged, expires_at')
      .eq('token', token)
      .single()
      .then(async ({ data, error }) => {
        if (error || !data) { setStatus('invalid'); return; }
        if (new Date(data.expires_at) < new Date()) { setStatus('expired'); return; }
        if (data.acknowledged) { setStatus('done'); return; }

        const { data: s } = await supabaseAnon
          .from('sessions')
          .select('id, title, profession, subject_name, interviewer, transcript, sha256_hash, created_at')
          .eq('id', data.session_id)
          .single();

        setRecord(data);
        setSession(s || null);
        setStatus('ready');
      });
  }, [token]);

  const handleAcknowledge = async () => {
    setSubmitting(true);
    try {
      const { error } = await supabaseAnon
        .from('statement_acknowledgements')
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

  if (status === 'loading') return <LoadingScreen />;
  if (status === 'invalid') return <StatusPage icon="❌" title="Invalid Link" desc="This link is invalid or does not exist." />;
  if (status === 'expired') return <StatusPage icon="⏰" title="Link Expired" desc="This statement link has expired. Please contact the officer." />;
  if (status === 'error') return <StatusPage icon="⚠️" title="Something went wrong" desc="Please try again." />;
  if (status === 'done') return (
    <StatusPage icon="✅" title="Statement Acknowledged" desc="Your acknowledgement has been recorded and linked to the official session report." color="green" />
  );

  const utterances = Array.isArray(session?.transcript) ? session.transcript : [];

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="w-5 h-5">
                <polyline points="4,16 7,11 10,21 13,9 16,23 19,11 22,18 25,14 28,16"
                  stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
            </div>
            <span className="font-bold text-gray-900">VeriRec</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900">Statement Verification</h1>
          <p className="text-gray-500 mt-2 text-sm">Please review your recorded statement and acknowledge its accuracy.</p>
        </div>

        {/* Session info */}
        {session && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h2 className="font-bold text-gray-900">{session.title}</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {session.interviewer && `Officer: ${session.interviewer}`}
                  {session.interviewer && session.created_at && ' · '}
                  {session.created_at && format(new Date(session.created_at), 'd MMM yyyy, HH:mm')}
                </p>
              </div>
              <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5 flex-shrink-0">
                <svg className="w-3.5 h-3.5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span className="text-xs font-semibold text-green-700">SHA-256 Verified</span>
              </div>
            </div>
            {session.sha256_hash && (
              <p className="text-[10px] text-gray-400 font-mono mt-3 break-all">{session.sha256_hash}</p>
            )}
          </div>
        )}

        {/* Transcript */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-5">
          <h3 className="font-bold text-gray-900 mb-4">Session Transcript</h3>
          {utterances.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {utterances.map((u, i) => {
                const speaker = u.speaker || '';
                const isOfficer = speaker === 'A' || speaker.toLowerCase().includes('officer') || speaker === session?.interviewer;
                return (
                  <div key={i} className={`flex ${isOfficer ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-xl px-4 py-2.5 ${isOfficer ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
                      <div className="text-[10px] font-bold uppercase tracking-wide mb-1 opacity-60">
                        {speaker || (isOfficer ? 'Officer' : 'Subject')}
                      </div>
                      <p className="text-sm leading-relaxed">{u.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-6">Transcript not available for this session.</p>
          )}
        </div>

        {/* Corrections */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-5">
          <h3 className="font-semibold text-gray-900 mb-1">
            Corrections or Comments
            <span className="text-gray-400 font-normal text-sm ml-1">(optional)</span>
          </h3>
          <p className="text-xs text-gray-400 mb-3">If any part of the transcript is inaccurate, note it here. This will be recorded alongside your acknowledgement.</p>
          <textarea
            value={corrections}
            onChange={e => setCorrections(e.target.value)}
            rows={3}
            placeholder="e.g. At 14:23, I said 'quarterly' not 'annually'..."
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <button
          onClick={handleAcknowledge}
          disabled={submitting}
          className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl disabled:opacity-40 hover:bg-blue-700 transition-colors text-sm"
        >
          {submitting ? 'Submitting...' : 'I Acknowledge This Statement'}
        </button>
        <p className="text-xs text-center text-gray-400 mt-3">
          Your acknowledgement is digitally timestamped. This does not constitute a legal admission.
        </p>
      </div>
    </div>
  );
}
