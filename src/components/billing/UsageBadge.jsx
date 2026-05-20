import { useBillingStore } from '../../store/billingStore.js';

export function UsageBadge() {
  const { subscription } = useBillingStore();
  if (!subscription) return null;

  const { sessions_used, sessions_limit, plan } = subscription;
  const unlimited = sessions_limit === -1;
  const pct = unlimited ? 0 : (sessions_used / sessions_limit) * 100;
  const critical = pct >= 90;

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden w-24">
        {!unlimited && (
          <div
            className={`h-full rounded-full transition-all ${critical ? 'bg-red-500' : 'bg-blue-500'}`}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        )}
      </div>
      <span className={`text-xs font-medium ${critical ? 'text-red-600' : 'text-gray-600'}`}>
        {unlimited ? '∞' : `${sessions_used}/${sessions_limit}`} sesi
      </span>
    </div>
  );
}
