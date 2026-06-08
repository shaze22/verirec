import { useState, useEffect } from 'react';
import { useBillingStore } from '../../store/billingStore.js';
import { createStripePortalSession, getStripeInvoices } from '../../api/billing.js';
import { format, differenceInDays } from 'date-fns';
import { Button } from '../ui/Button.jsx';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const PLAN_CONFIG = {
  free:      { label: 'Free',         bg: 'bg-gray-100',    text: 'text-gray-700', ring: 'ring-gray-200' },
  counselor: { label: 'Counselor',    bg: 'bg-violet-600',  text: 'text-white',    ring: 'ring-violet-300' },
  starter:   { label: 'Professional', bg: 'bg-blue-600',    text: 'text-white',    ring: 'ring-blue-300' },
  pro:       { label: 'Pro',          bg: 'bg-violet-600',  text: 'text-white',    ring: 'ring-violet-300' },
  biz:       { label: 'Business',     bg: 'bg-violet-600',  text: 'text-white',    ring: 'ring-violet-300' },
};

const STATUS_CONFIG = {
  active:   { label: 'Active',           dot: 'bg-green-500' },
  trialing: { label: 'Trial Period',     dot: 'bg-blue-500' },
  past_due: { label: 'Payment Overdue',  dot: 'bg-red-500' },
  canceled: { label: 'Cancelled',        dot: 'bg-gray-400' },
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
      toast.error('Unable to open portal. Please try again.');
    } finally {
      setPortalLoading(false);
    }
  };

  const downloadReceipt = async () => {
    if (!isPaid) { toast.error('No receipt. You are on the free plan.'); return; }
    const latest = charges?.[0];
    if (latest?.receipt_url) {
      window.open(latest.receipt_url, '_blank');
    } else {
      toast.error('No receipt found. Try "Manage Subscription" to view all invoices.');
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
            {subscription.status === 'trialing' ? 'Trial ends' : 'Next billing'}:&nbsp;
            <span className="font-medium text-gray-600">
              {format(new Date(subscription.next_billing_date), 'dd MMM yyyy')}
            </span>
          </p>
        )}
      </div>

      {/* Alerts */}
      {subscription.status === 'past_due' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
          Your subscription payment failed. Update your payment method to avoid service interruption.
        </div>
      )}
      {subscription.status === 'trialing' && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-700">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span>You are in a 14-day trial period. No charge until the trial ends.</span>
            {trialDaysLeft !== null && (
              <span className={`font-bold whitespace-nowrap ${trialDaysLeft <= 3 ? 'text-red-600' : 'text-blue-800'}`}>
                {trialDaysLeft === 0 ? 'Ends today' : `${trialDaysLeft} days left`}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Usage bar */}
      <div className="bg-gray-50 rounded-xl p-4 space-y-3">
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-700">Monthly Sessions</p>
            <p className={`text-sm font-bold ${nearLimit ? 'text-red-600' : 'text-gray-900'}`}>
              {unlimited ? '∞' : `${subscription.sessions_used} / ${subscription.sessions_limit}`}
            </p>
          </div>
          {!unlimited && (
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${nearLimit ? 'bg-red-500' : 'bg-violet-500'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          )}
          {nearLimit && subscription.plan !== 'counselor' && (
            <p className="text-xs text-red-600 mt-1.5">Limit almost reached. Consider upgrading.</p>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => navigate(subscription.plan === 'counselor' ? '/pricing?tab=kaunselor' : '/pricing')}>
          {isPaid ? 'Change Plan' : 'Upgrade'}
        </Button>
        {isPaid && (
          <Button variant="outline" loading={portalLoading} onClick={openPortal}>
            Manage Subscription
          </Button>
        )}
        <Button
          variant="outline"
          loading={receiptLoading}
          onClick={downloadReceipt}
          disabled={!isPaid}
          title={!isPaid ? 'No receipt for free plan' : 'Download latest receipt'}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Download Receipt
        </Button>
      </div>

      {isPaid && (
        <p className="text-xs text-gray-400">
          "Manage Subscription": cancel, change card, or view all invoices via the secure Stripe portal.
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
            Payment History {charges.length > 0 && `(${charges.length})`}
          </button>

          {showHistory && (
            <div className="mt-3 space-y-2">
              {charges.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No payment records found.</p>
              ) : charges.map(c => (
                <div key={c.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {c.description || 'VeriRec Payment'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {format(new Date(c.created * 1000), 'dd MMM yyyy, HH:mm')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-sm font-bold text-gray-900">
                      ${(c.amount / 100).toFixed(2)}
                    </span>
                    {c.receipt_url && (
                      <a
                        href={c.receipt_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-violet-600 hover:text-violet-800 font-medium border border-violet-200 px-2 py-1 rounded-lg hover:bg-violet-50 transition-colors"
                      >
                        Receipt
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
