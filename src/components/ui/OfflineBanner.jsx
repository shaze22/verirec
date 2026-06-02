import { useState, useEffect } from 'react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus.js';
import { on } from '../../lib/sync.js';

export function OfflineBanner() {
  const { isOnline } = useOnlineStatus();
  const [syncing, setSyncing] = useState(false);
  const [showRestored, setShowRestored] = useState(false);

  useEffect(() => {
    const offSync = on('sync:start',   () => setSyncing(true));
    const offDone = on('sync:success', () => { setSyncing(false); setShowRestored(true); setTimeout(() => setShowRestored(false), 3000); });
    const offErr  = on('sync:error',   () => setSyncing(false));
    return () => { offSync(); offDone(); offErr(); };
  }, []);

  if (syncing) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-blue-600 text-white text-sm text-center py-2 px-4 flex items-center justify-center gap-2">
        <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin inline-block flex-shrink-0" />
        Syncing data...
      </div>
    );
  }

  if (showRestored) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-green-600 text-white text-sm text-center py-2 px-4 flex items-center justify-center gap-2">
        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        Back online — data synced
      </div>
    );
  }

  if (!isOnline) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-gray-900 text-white text-sm text-center py-2 px-4 flex items-center justify-center gap-2">
        <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse flex-shrink-0 inline-block" />
        No internet connection — data will sync when back online
      </div>
    );
  }

  return null;
}
