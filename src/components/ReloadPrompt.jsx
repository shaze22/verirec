import { useRegisterSW } from 'virtual:pwa-register/react';

/**
 * Shows a small banner when a new app version is available (PWA),
 * so users aren't stuck on a stale cached build. Tapping Reload
 * activates the new service worker and refreshes.
 */
export default function ReloadPrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(err) { console.error('SW registration error:', err); },
  });

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:right-4 z-[100] sm:max-w-sm">
      <div className="bg-white rounded-2xl ring-1 ring-violet-200 shadow-xl p-4 flex items-center gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center text-xl rounded-xl bg-gradient-to-br from-violet-50 to-fuchsia-50 ring-1 ring-violet-100">✨</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">New version available</p>
          <p className="text-xs text-gray-500">Reload to get the latest update.</p>
        </div>
        <button
          onClick={() => updateServiceWorker(true)}
          className="flex-shrink-0 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-sm shadow-violet-200 hover:-translate-y-0.5 transition-all"
        >
          Reload
        </button>
        <button
          onClick={() => setNeedRefresh(false)}
          aria-label="Dismiss"
          className="flex-shrink-0 text-gray-300 hover:text-gray-500 text-xl leading-none px-1"
        >
          ×
        </button>
      </div>
    </div>
  );
}
