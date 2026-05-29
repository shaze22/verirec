import { useOnlineStatus } from '../../hooks/useOnlineStatus.js';
import { useBillingStore } from '../../store/billingStore.js';

export function TopBar({ title, actions, action, onBack }) {
  const { isOnline, wasOffline } = useOnlineStatus();
  const { subscription } = useBillingStore();

  return (
    <header className="h-16 bg-white border-b px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {onBack && (
          <button onClick={onBack} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      </div>
      <div className="flex items-center gap-4">
        {!isOnline && (
          <span className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
            Luar Talian
          </span>
        )}
        {isOnline && wasOffline && (
          <span className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
            Kembali Dalam Talian
          </span>
        )}
        {subscription && subscription.sessions_limit !== -1 && (
          <span className="text-xs text-gray-500">
            Sesi: {subscription.sessions_used}/{subscription.sessions_limit}
          </span>
        )}
        {actions}
        {action}
      </div>
    </header>
  );
}
