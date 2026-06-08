import { useState } from 'react';
import { useBillingStore } from '../../store/billingStore.js';
import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';
import { useNavigate } from 'react-router-dom';

const planOrder = { free: 0, counselor: 1, starter: 1, pro: 2, biz: 3 };

export function BillingGate({ plan, children, sessionCheck = false }) {
  const { subscription, loading } = useBillingStore();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const navigate = useNavigate();

  if (loading) return <>{children}</>;

  const currentLevel = planOrder[subscription?.plan || 'free'];
  const requiredLevel = planOrder[plan] || 0;
  const hasPlan = currentLevel >= requiredLevel;
  const extra = subscription?.extra_sessions ?? 0;
  const hasSessionsLeft = !sessionCheck || subscription?.sessions_limit === -1 ||
    (subscription?.sessions_used ?? 0) < (subscription?.sessions_limit ?? 2) + extra;

  if (hasPlan && hasSessionsLeft) return <>{children}</>;

  const pricingUrl = subscription?.plan === 'counselor' ? '/pricing?tab=kaunselor' : '/pricing';

  return (
    <>
      <div onClick={() => setShowUpgrade(true)} className="cursor-pointer">
        <div className="pointer-events-none opacity-50">{children}</div>
      </div>

      <Modal
        open={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        title="Upgrade Required"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setShowUpgrade(false)}>Cancel</Button>
            <Button onClick={() => navigate(pricingUrl)}>View Plans</Button>
          </div>
        }
      >
        <div className="text-center py-4">
          <div className="text-4xl mb-4">🔒</div>
          {!hasSessionsLeft ? (
            <>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Session Limit Reached</h3>
              <p className="text-gray-600">
                You have used {subscription?.sessions_used} of {subscription?.sessions_limit} sessions this month. Upgrade to continue.
              </p>
            </>
          ) : (
            <>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Exclusive Feature</h3>
              <p className="text-gray-600">
                This feature requires the <strong className="capitalize">{plan}</strong> plan or higher.
              </p>
            </>
          )}
        </div>
      </Modal>
    </>
  );
}
