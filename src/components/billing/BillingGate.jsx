import { useState } from 'react';
import { useBillingStore } from '../../store/billingStore.js';
import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';
import { useNavigate } from 'react-router-dom';

const planOrder = { free: 0, starter: 1, pro: 2, biz: 3 };

export function BillingGate({ plan, children, sessionCheck = false }) {
  const { subscription, loading } = useBillingStore();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const navigate = useNavigate();

  if (loading) return <>{children}</>;

  const currentLevel = planOrder[subscription?.plan || 'free'];
  const requiredLevel = planOrder[plan] || 0;
  const hasPlan = currentLevel >= requiredLevel;
  const hasSessionsLeft = !sessionCheck || subscription?.sessions_limit === -1 ||
    (subscription?.sessions_used ?? 0) < (subscription?.sessions_limit ?? 3);

  if (hasPlan && hasSessionsLeft) return <>{children}</>;

  return (
    <>
      <div onClick={() => setShowUpgrade(true)} className="cursor-pointer">
        <div className="pointer-events-none opacity-50">{children}</div>
      </div>

      <Modal
        open={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        title="Naik Taraf Diperlukan"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setShowUpgrade(false)}>Batal</Button>
            <Button onClick={() => navigate('/pricing')}>Lihat Pelan</Button>
          </div>
        }
      >
        <div className="text-center py-4">
          <div className="text-4xl mb-4">🔒</div>
          {!hasSessionsLeft ? (
            <>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Had Sesi Dicapai</h3>
              <p className="text-gray-600">
                Anda telah menggunakan {subscription?.sessions_used} daripada {subscription?.sessions_limit} sesi anda
                untuk bulan ini. Naik taraf untuk teruskan.
              </p>
            </>
          ) : (
            <>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Ciri Eksklusif</h3>
              <p className="text-gray-600">
                Ciri ini memerlukan pelan <strong className="capitalize">{plan}</strong> atau lebih tinggi.
              </p>
            </>
          )}
        </div>
      </Modal>
    </>
  );
}
