import { useState, useEffect } from 'react';
import { useBillingStore } from '../../store/billingStore.js';
import { createStripePortalSession, getStripeInvoices } from '../../api/billing.js';
import { format, differenceInDays } from 'date-fns';
import { Button } from '../ui/Button.jsx';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const PLAN_CONFIG = {
  free:      { label: 'Percuma',    bg: 'bg-gray-100',    text: 'text-gray-700', ring: 'ring-gray-200' },
  counselor: { label: 'Kaunselor',  bg: 'bg-emerald-600', text: 'text-white',    ring: 'ring-emerald-300' },
  starter:   { label: 'Starter',    bg: 'bg-blue-600',    text: 'text-white',    ring: 'ring-blue-300' },
  pro:       { label: 'Pro',        bg: 'bg-violet-600',  text: 'text-white',    ring: 'ring-violet-300' },
  biz:       { label: 'Perniagaan', bg: 'bg-emerald-600', text: 'text-white',    ring: 'ring-emerald-300' },
};

const STATUS_CONFIG = {
  active:   { label: 'Aktif',              dot: 'bg-green-500' },
  trialing: { label: 'Tempoh Percubaan',   dot: 'bg-blue-500' },
  past_due: { label: 'Pembayaran Tertunggak', dot: 'bg-red-500' },
  canceled: { label: 'Dibatalkan',         dot: 'bg-gray-400' },
};

export function BillingSettings() {
  const { subscription } = useBillingStore();
  const [portalLoading, setPortalLoading] = useState(false);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [charges, setCharges] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (subscription?.plan !== 'free') {
      getStripeInvoices()
        .then(data => setCharges(data.charges || []))
        .catch(() => setCharges([]));
    }
  }, [subscription?.plan]);

  if (!subscription) {
    return <div className="h-24 bg-gray-50 rounded-xl animate-pulse" />;
  }

  const plan = PLAN_CONFIG[subscription.plan] || PLAN_CONFIG.free;
  const status = STATUS_CONFIG[subscription.status] || STATUS_CONFIG.active;
  const isPaid = subscription.plan !== 'free';
  const unlimited = subscription.sessions_limit === -1;
  const trialDaysLeft = subscription.status === 'trialing' && subscription.next_billing_date
    ? Math.max(0, differenceInDays(new Date(subscription.next_billing_date), new Date()))
    : null;
  const pct = unlimited ? 0 : Math.min((subscription.sessions_used / subscription.sessions_limit) * 100, 100);
  const nearLimit = !unlimited && pct >= 80;

  const openPortal = async () => {
    setPortalLoading(true);
    try {
      const { url } = await createStripePortalSession();
      window.location.href = url;
    } catch {
      toast.error('Tidak dapat membuka portal. Cuba lagi.');
    } finally {
      setPortalLoading(false);
    }
  };

  const downloadReceipt = async () => {
    if (!isPaid) { toast.error('Tiada resit — anda menggunakan pelan percuma.'); return; }
    const latest = charges?.[0];
    if (latest?.receipt_url) {
      window.open(latest.receipt_url, '_blank');
    } else {
      toast.error('Tiada resit dijumpai. Cuba "Urus Langganan" untuk lihat semua invois.');
    }
  };

  return (
    <div className="space-y-5">
      {/* Plan badge + status */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-bold ring-2 ${plan.bg} ${plan.text} ${plan.ring}`}>
            {plan.label}
          </span>
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${status.dot}`} />
            <span className="text-sm text-gray-500">{status.label}</span>
          </div>
        </div>
        {subscription.next_billing_date && (
          <p className="text-xs text-gray-400">
            {subscription.status === 'trialing' ? 'Percubaan tamat' : 'Bil seterusnya'}:&nbsp;
            <span className="font-medium text-gray-600">
              {format(new Date(subscription.next_billing_date), 'dd MMM yyyy')}
            </span>
          </p>
        )}
      </div>

      {/* Alerts */}
      {subscription.status === 'past_due' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
          Pembayaran langganan anda gagal. Kemas kini kaedah pembayaran untuk elak gangguan perkhidmatan.
        </div>
      )}
      {subscription.status === 'trialing' && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-700">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span>Anda dalam tempoh percubaan 14 hari. Tiada caj sehingga tempoh tamat.</span>
            {trialDaysLeft !== null && (
              <span className={`font-bold whitespace-nowrap ${trialDaysLeft <= 3 ? 'text-red-600' : 'text-blue-800'}`}>
                {trialDaysLeft === 0 ? 'Tamat hari ini' : `${trialDaysLeft} hari lagi`}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Usage bar */}
      <div className="bg-gray-50 rounded-xl p-4 space-y-3">
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-700">Sesi Bulanan</p>
            <p className={`text-sm font-bold ${nearLimit ? 'text-red-600' : 'text-gray-900'}`}>
              {unlimited ? '∞' : `${subscription.sessions_used} / ${subscription.sessions_limit}`}
            </p>
          </div>
          {!unlimited && (
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${nearLimit ? 'bg-red-500' : 'bg-blue-500'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          )}
          {nearLimit && subscription.plan !== 'counselor' && (
            <p className="text-xs text-red-600 mt-1.5">Had hampir dicapai — pertimbangkan untuk naik taraf.</p>
          )}
          {nearLimit && subscription.plan === 'counselor' && (
            <p className="text-xs text-orange-600 mt-1.5">Sesi bulanan hampir habis — topup bila perlu.</p>
          )}
        </div>
        {(subscription.extra_sessions > 0) && (
          <div className="flex items-center justify-between pt-2 border-t border-gray-200">
            <p className="text-sm text-gray-600">Sesi Top-up Baki</p>
            <span className="text-sm font-bold text-emerald-600">{subscription.extra_sessions} sesi</span>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => navigate(subscription.plan === 'counselor' ? '/pricing?tab=kaunselor' : '/pricing')}>
          {subscription.plan === 'counselor' ? 'Topup Sesi' : isPaid ? 'Tukar Pelan' : 'Naik Taraf'}
        </Button>
        {isPaid && (
          <Button variant="outline" loading={portalLoading} onClick={openPortal}>
            Urus Langganan
          </Button>
        )}
        <Button
          variant="outline"
          loading={receiptLoading}
          onClick={downloadReceipt}
          disabled={!isPaid}
          title={!isPaid ? 'Tiada resit untuk pelan percuma' : 'Muat turun resit terkini'}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Muat Turun Resit
        </Button>
      </div>

      {isPaid && (
        <p className="text-xs text-gray-400">
          "Urus Langganan" — batal, tukar kad, atau lihat semua invois melalui portal selamat Stripe.
        </p>
      )}

      {/* Payment History */}
      {isPaid && charges !== null && (
        <div>
          <button
            onClick={() => setShowHistory(v => !v)}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors"
          >
            <svg className={`w-4 h-4 transition-transform ${showHistory ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            Sejarah Pembayaran {charges.length > 0 && `(${charges.length})`}
          </button>

          {showHistory && (
            <div className="mt-3 space-y-2">
              {charges.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Tiada rekod pembayaran.</p>
              ) : charges.map(c => (
                <div key={c.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {c.description || 'Pembayaran VeriRec'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {format(new Date(c.created * 1000), 'dd MMM yyyy, HH:mm')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-sm font-bold text-gray-900">
                      RM{(c.amount / 100).toFixed(2)}
                    </span>
                    {c.receipt_url && (
                      <a
                        href={c.receipt_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-emerald-600 hover:text-emerald-800 font-medium border border-emerald-200 px-2 py-1 rounded-lg hover:bg-emerald-50 transition-colors"
                      >
                        Resit
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
