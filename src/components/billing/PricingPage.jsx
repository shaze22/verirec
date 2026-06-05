import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { createStripeCheckout } from '../../api/billing.js';
import { useBillingStore } from '../../store/billingStore.js';
import { Button } from '../ui/Button.jsx';
import { CONFIG } from '../../config.js';
import { isCounselorSubdomain } from '../../lib/subdomain.js';
import toast from 'react-hot-toast';

const COUNSELOR_FEATURES = [
  '5 counseling sessions / month',
  'Automated QR booking — clients self-serve',
  'Digital client files + session history',
  'SOP-format Case Session Notes (PDF)',
  'MBTI + RIASEC assessment in sessions',
  'AI report + PDF export',
  'Schedule & Appointments + reminders',
  'Action Plans & Clinical Referrals',
  'Top-up sessions anytime',
];

const PROFESSIONAL_FEATURES = [
  '5 recording sessions / month',
  'AI analysis + real-time red flag detection',
  'PEACE Model guide in sessions',
  'SOP PDF reports (profession-specific)',
  'SHA-256 chain of custody',
  'Automatic speaker diarization',
  'Centralised subject & case files',
  'Top-up sessions anytime',
  'Priority email support',
];

function Check({ color = 'text-violet-500' }) {
  return (
    <svg className={`w-4 h-4 mt-0.5 flex-shrink-0 ${color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

export function PricingPage() {
  const [searchParams] = useSearchParams();
  const isCounselor = isCounselorSubdomain();
  const [tab, setTab] = useState(isCounselor || searchParams.get('tab') === 'kaunselor' ? 'kaunselor' : 'umum');
  const [loading, setLoading] = useState(null);
  const { subscription } = useBillingStore();
  const navigate = useNavigate();

  const subscribe = async (plan) => {
    if (plan === 'free') return;
    if (plan === 'enterprise') {
      window.location.href = 'mailto:hello@verirec.app?subject=Enterprise Plan Enquiry — VeriRec';
      return;
    }
    setLoading(plan);
    try {
      const { url } = await createStripeCheckout(plan, false);
      window.location.href = url;
    } catch (err) {
      const msg = err.message === 'auth_expired'
        ? 'Please sign in again.'
        : err.message === 'Stripe not configured'
        ? 'Payment system not configured.'
        : `Error: ${err.message}`;
      toast.error(msg, { duration: 8000 });
    } finally {
      setLoading(null);
    }
  };

  const isCurrent = (key) => subscription?.plan === key;
  const extraSessions = subscription?.extra_sessions ?? 0;
  const sessionBalance = Math.max(0, (subscription?.sessions_limit ?? 0) - (subscription?.sessions_used ?? 0));

  return (
    <>
      <Helmet>
        <title>Pricing — VeriRec</title>
        <meta name="description" content="$25/month, 5 sessions. No contract. Top-up anytime." />
        <link rel="canonical" href="https://www.verirec.app/pricing" />
      </Helmet>
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Plans & Pricing</h1>
          <p className="text-gray-500 mt-2">Simple pricing. No surprises. Top-up when needed.</p>
        </div>

        {/* Tab toggle — hidden on counselor subdomain */}
        {!isCounselor && (
          <div className="flex justify-center mb-10">
            <div className="inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1 gap-1">
              <button onClick={() => setTab('umum')}
                className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'umum' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                🔍 VeriRec Professional
              </button>
              <button onClick={() => setTab('kaunselor')}
                className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${tab === 'kaunselor' ? 'bg-violet-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                💬 Counselor
                {isCurrent('counselor') && <span className="w-2 h-2 rounded-full bg-violet-300 inline-block" />}
              </button>
            </div>
          </div>
        )}

        {/* ── PROFESSIONAL TAB ── */}
        {tab === 'umum' && !isCounselor && (
          <div className="space-y-8">
            <div className="grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto">

              {/* Free */}
              <div className={`rounded-2xl border-2 p-6 flex flex-col ${isCurrent('free') ? 'border-gray-400 bg-gray-50' : 'border-gray-200 bg-white'}`}>
                {isCurrent('free') && <p className="text-xs font-semibold text-gray-500 mb-2">CURRENT PLAN</p>}
                <p className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-1">Free</p>
                <div className="flex items-end gap-1 mb-1">
                  <span className="text-4xl font-bold text-gray-900">$0</span>
                </div>
                <p className="text-xs text-gray-400 mb-5">2 sessions per month · forever</p>
                <ul className="space-y-2 flex-1 mb-6">
                  {['2 sessions/month', 'Real-time AI transcription', 'Basic PDF report', 'SHA-256 chain of custody'].map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-600"><Check color="text-gray-400" />{f}</li>
                  ))}
                  {['Real-time AI analysis', 'PEACE Model guide', 'Session top-up'].map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-400">
                      <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <Button variant="outline" className="w-full" disabled={isCurrent('free') || subscription?.plan !== 'free'} onClick={() => navigate('/session/new')}>
                  {isCurrent('free') ? 'Current Plan' : 'Continue Free'}
                </Button>
              </div>

              {/* Professional */}
              <div className={`relative rounded-2xl border-2 p-6 flex flex-col shadow-lg ${isCurrent('starter') ? 'border-blue-400 bg-blue-50' : 'border-blue-600 bg-white'}`}>
                {!isCurrent('starter') && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-bold px-4 py-1.5 rounded-full whitespace-nowrap shadow">MOST POPULAR</div>
                )}
                {isCurrent('starter') && <p className="text-xs font-semibold text-blue-600 mb-2">CURRENT PLAN</p>}
                <p className="text-sm font-semibold text-blue-600 uppercase tracking-wide mb-1">Professional</p>
                <div className="flex items-end gap-1 mb-1">
                  <span className="text-4xl font-bold text-gray-900">$25</span>
                  <span className="text-gray-400 text-sm mb-1">USD/month</span>
                </div>
                <p className="text-xs text-gray-400 mb-5">5 sessions · $5/session · cancel anytime</p>
                <ul className="space-y-2 flex-1 mb-6">
                  {PROFESSIONAL_FEATURES.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-700"><Check color="text-blue-500" />{f}</li>
                  ))}
                </ul>
                {isCurrent('starter') && (
                  <p className="text-xs text-blue-700 font-medium text-center mb-3">
                    Balance: {sessionBalance} sessions{extraSessions > 0 ? ` + ${extraSessions} top-up` : ''}
                  </p>
                )}
                <Button variant="primary" className="w-full" disabled={isCurrent('starter')} loading={loading === 'starter'} onClick={() => subscribe('starter')}>
                  {isCurrent('starter') ? 'Active Plan' : 'Subscribe Now'}
                </Button>
                <p className="text-xs text-center text-gray-400 mt-2">No contract · Cancel anytime</p>
              </div>
            </div>

            {/* Top-up */}
            <div className="max-w-md mx-auto bg-white rounded-2xl border p-6">
              <p className="text-sm font-bold text-gray-700 mb-1 text-center">Session Top-Up</p>
              <p className="text-xs text-gray-400 text-center mb-4">Available for Professional plan. Never expires — carried to next month.</p>
              <div className="space-y-3">
                {CONFIG.topups.map(t => (
                  <div key={t.key} className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-gray-700">{t.label}</span>
                      <span className="text-xs text-gray-400 ml-2">${t.perSession}/session</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-gray-900">${t.price}</span>
                      <Button variant="outline" size="sm" disabled={subscription?.plan !== 'starter' || loading === t.key} loading={loading === t.key} onClick={() => subscribe(t.key)}>
                        Buy
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              {subscription?.plan !== 'starter' && (
                <p className="text-xs text-gray-400 text-center mt-3">Top-up available for Professional plan subscribers only.</p>
              )}
            </div>

            {/* Org plan */}
            <div className="max-w-2xl mx-auto bg-white rounded-2xl border-2 border-gray-200 p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">Organization</p>
                  <p className="text-gray-700 text-sm mb-1">For investigation departments &amp; units — up to 5 users</p>
                  <p className="text-2xl font-bold text-gray-900">$249<span className="text-sm font-normal text-gray-400">/month · 5 users · 100 sessions/user</span></p>
                </div>
                <Button variant="outline" className="flex-shrink-0" onClick={() => subscribe('enterprise')}>Contact Us →</Button>
              </div>
            </div>

            {/* Enterprise */}
            <div className="max-w-2xl mx-auto bg-gray-50 rounded-2xl border p-6 text-center">
              <p className="font-semibold text-gray-900 mb-1">Larger team? Enterprise packages available.</p>
              <p className="text-sm text-gray-500 mb-4">For government agencies, hospitals, and large enterprises. Includes onboarding, training, and SLA support.</p>
              <Button variant="outline" onClick={() => subscribe('enterprise')}>Contact Us →</Button>
            </div>
          </div>
        )}

        {/* ── COUNSELOR TAB ── */}
        {tab === 'kaunselor' && (
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="grid lg:grid-cols-2 gap-8 items-start">

              {/* Counselor plan card */}
              <div className={`relative rounded-2xl border-2 p-6 flex flex-col ${isCurrent('counselor') ? 'border-violet-400 bg-violet-50' : 'border-violet-600 bg-white shadow-xl'}`}>
                {!isCurrent('counselor') && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-violet-600 text-white text-xs font-bold px-4 py-1.5 rounded-full whitespace-nowrap shadow">
                    Counselor Plan
                  </div>
                )}
                {isCurrent('counselor') && <p className="text-xs font-semibold text-violet-700 mb-2">CURRENT PLAN</p>}
                <p className="text-sm font-semibold text-violet-600 uppercase tracking-wide mb-1">Counselor</p>
                <div className="flex items-end gap-1 mb-1">
                  <span className="text-4xl font-bold text-gray-900">$25</span>
                  <span className="text-gray-400 text-sm mb-1">USD/month</span>
                </div>
                <p className="text-xs text-gray-400 mb-1">5 sessions · $5/session · cancel anytime</p>
                <p className="text-xs text-violet-500 mb-5">~RM110 · pay in any currency via Stripe</p>
                <ul className="space-y-2 flex-1 mb-6">
                  {COUNSELOR_FEATURES.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-700"><Check />{f}</li>
                  ))}
                </ul>
                {isCurrent('counselor') && (
                  <p className="text-xs text-center text-violet-700 font-medium mb-3">
                    Balance: {sessionBalance} sessions{extraSessions > 0 ? ` + ${extraSessions} top-up` : ''}
                  </p>
                )}
                <Button variant="primary" className="w-full bg-violet-600 hover:bg-violet-700" disabled={isCurrent('counselor')} loading={loading === 'counselor'} onClick={() => subscribe('counselor')}>
                  {isCurrent('counselor') ? 'Active Plan' : 'Subscribe Now'}
                </Button>
                <p className="text-xs text-center text-gray-400 mt-2">No contract · Cancel anytime · Secure via Stripe</p>
              </div>

              {/* Top-up packs */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-semibold text-gray-900 mb-1">Session Top-Up</h3>
                  <p className="text-sm text-gray-500">Never expires — carried to next month.</p>
                </div>

                {CONFIG.topups.map(topup => (
                  <div key={topup.key} className="rounded-xl border bg-white p-4 flex items-center justify-between gap-4 hover:border-violet-200 transition-colors">
                    <div>
                      <p className="font-semibold text-gray-900">{topup.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">${topup.perSession}/session</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-xl font-bold text-gray-900">${topup.price}</p>
                      <Button variant="outline" size="sm" disabled={subscription?.plan !== 'counselor'} loading={loading === topup.key} onClick={() => subscribe(topup.key)}>
                        Buy
                      </Button>
                    </div>
                  </div>
                ))}

                {subscription?.plan !== 'counselor' && (
                  <p className="text-xs text-gray-400 text-center">Top-up available for Counselor plan subscribers only.</p>
                )}

                <div className="bg-violet-50 rounded-xl border border-violet-100 p-4">
                  <p className="text-sm font-semibold text-violet-800 mb-1">Clear cost per client</p>
                  <p className="text-sm text-violet-700">Top-up at $3/session — cheaper than the base rate. Easy to plan client billing.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
