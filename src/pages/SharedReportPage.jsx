import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Helmet } from 'react-helmet-async';
import { professionLabel } from '../data/professions.js';

const RISK_CONFIG = {
  low:    { label: 'Low',      bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200' },
  medium: { label: 'Moderate', bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200' },
  high:   { label: 'High',     bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200' },
};

export default function SharedReportPage() {
  const { token } = useParams();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`/api/share-session?token=${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setSession(data.session);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Report Not Found</h2>
          <p className="text-sm text-gray-500 mb-6">This link may have expired or is no longer valid.</p>
          <Link to="/" className="inline-block px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors">
            Go to VeriRec
          </Link>
        </div>
      </div>
    );
  }

  const report = session.report;
  const risk = RISK_CONFIG[report?.riskLevel] || RISK_CONFIG.low;

  return (
    <>
      <Helmet>
        <title>{session.title} — VeriRec Report</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b sticky top-0 z-10">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="w-7 h-7 flex-shrink-0">
                <rect width="32" height="32" rx="8" fill="#2563eb"/>
                <polyline points="4,16 7,11 10,21 13,9 16,23 19,11 22,18 25,14 28,16"
                  stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
              <span className="font-bold text-gray-900">VeriRec</span>
              <span className="text-gray-300">|</span>
              <span className="text-sm text-gray-500">Shared Report</span>
            </div>
            <Link to="/auth" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              Try Free →
            </Link>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
          {/* Session meta */}
          <div className="bg-white rounded-2xl border p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-xl font-bold text-gray-900 mb-1">{session.title}</h1>
                <div className="flex flex-wrap gap-2 text-sm text-gray-500">
                  <span>{professionLabel(session.profession)}</span>
                  <span>·</span>
                  <span>{session.subject_name}</span>
                  {session.case_number && <><span>·</span><span>{session.case_number}</span></>}
                  <span>·</span>
                  <span>{format(new Date(session.created_at), 'dd MMM yyyy')}</span>
                  <span>·</span>
                  <span>{Math.round((session.duration || 0) / 60)} min</span>
                </div>
              </div>
              {report?.riskLevel && (
                <div className={`px-3 py-1.5 rounded-full text-sm font-medium border ${risk.bg} ${risk.text} ${risk.border}`}>
                  Risk: {risk.label}
                </div>
              )}
            </div>
          </div>

          {!report ? (
            <div className="bg-white rounded-2xl border p-8 text-center text-gray-500">
              AI report not yet generated for this session.
            </div>
          ) : (
            <>
              {/* Summary */}
              {report.summary && (
                <div className="bg-white rounded-2xl border p-6">
                  <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Summary</h2>
                  <p className="text-gray-800 leading-relaxed">{report.summary}</p>
                </div>
              )}

              {/* Key findings */}
              {report.keyFindings?.length > 0 && (
                <div className="bg-white rounded-2xl border p-6">
                  <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Key Findings</h2>
                  <ul className="space-y-2">
                    {report.keyFindings.map((f, i) => (
                      <li key={i} className="flex gap-3 text-sm text-gray-700">
                        <span className="w-5 h-5 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendations */}
              {report.recommendations?.length > 0 && (
                <div className="bg-white rounded-2xl border p-6">
                  <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Recommendations</h2>
                  <ul className="space-y-2">
                    {report.recommendations.map((r, i) => (
                      <li key={i} className="flex gap-3 text-sm text-gray-700">
                        <span className="text-green-500 flex-shrink-0 mt-0.5">→</span>
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Red flags */}
              {report.redFlags?.length > 0 && (
                <div className="bg-red-50 rounded-2xl border border-red-200 p-6">
                  <h2 className="text-sm font-semibold text-red-600 uppercase tracking-wide mb-3">Red Flags</h2>
                  <ul className="space-y-2">
                    {report.redFlags.map((f, i) => (
                      <li key={i} className="flex gap-2 text-sm text-red-800">
                        <span>⚠</span>{f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Follow-up */}
              {report.followUpRequired && report.followUpItems?.length > 0 && (
                <div className="bg-blue-50 rounded-2xl border border-blue-200 p-6">
                  <h2 className="text-sm font-semibold text-blue-700 uppercase tracking-wide mb-3">Follow-up Actions</h2>
                  <ul className="space-y-2">
                    {report.followUpItems.map((item, i) => (
                      <li key={i} className="flex gap-2 text-sm text-blue-800">
                        <span className="flex-shrink-0">□</span>{item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          {/* CTA */}
          <div className="bg-blue-600 rounded-2xl p-6 text-center">
            <p className="text-white font-semibold mb-1">Generate AI reports for your own sessions</p>
            <p className="text-blue-200 text-sm mb-4">Professional session recording platform, PDPA-compliant for Malaysia</p>
            <Link to="/auth?mode=register" className="inline-block px-6 py-2.5 bg-white text-blue-600 font-semibold text-sm rounded-xl hover:bg-blue-50 transition-colors">
              Try Free →
            </Link>
          </div>

          <p className="text-center text-xs text-gray-400 pb-4">
            Report generated by VeriRec on {format(new Date(session.created_at), 'dd MMM yyyy')}.
          </p>
        </div>
      </div>
    </>
  );
}
