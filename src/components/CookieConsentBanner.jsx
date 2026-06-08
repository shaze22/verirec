import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';
import { useAuthStore } from '../store/authStore.js';

const CONSENT_KEY = 'cookie_consent';
const ANON_ID_KEY = 'anon_session_id';

function getAnonId() {
  let id = localStorage.getItem(ANON_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(ANON_ID_KEY, id);
  }
  return id;
}

export function CookieConsentBanner() {
  const { user } = useAuthStore();
  const [visible, setVisible] = useState(false);
  const [detail, setDetail] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(CONSENT_KEY)) {
      setVisible(true);
    }
  }, []);

  const recordConsent = async (decision) => {
    try {
      await supabase.from('consent_logs').insert({
        user_id: user?.id || null,
        anon_id: user ? null : getAnonId(),
        decision,
        user_agent: navigator.userAgent,
      });
    } catch {
      // localStorage is authoritative — DB record is audit trail only
    }
  };

  const handleAccept = async () => {
    localStorage.setItem(CONSENT_KEY, 'accepted');
    setVisible(false);
    await recordConsent('accepted');
  };

  const handleDecline = async () => {
    localStorage.setItem(CONSENT_KEY, 'declined');
    setVisible(false);
    await recordConsent('declined');
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 bg-white border border-gray-200 rounded-2xl shadow-xl p-4">
      <div className="flex items-start justify-between gap-2 mb-3">
        <p className="text-sm font-semibold text-gray-900">Cookies</p>
        <button onClick={handleDecline} className="text-gray-400 hover:text-gray-600 text-lg leading-none flex-shrink-0">✕</button>
      </div>
      <p className="text-xs text-gray-500 leading-relaxed mb-1">
        We use essential cookies for login and security, plus optional analytics to improve the product.{' '}
        <a href="/privacy" className="text-violet-600 hover:underline">Privacy Policy</a>
      </p>
      {detail && (
        <div className="mt-2 mb-2 space-y-1.5">
          <p className="text-xs text-gray-500"><strong className="text-gray-700">Essential</strong> — Login, session, security. Always on.</p>
          <p className="text-xs text-gray-500"><strong className="text-gray-700">Analytics</strong> — Google Analytics. No personal data shared.</p>
        </div>
      )}
      <button onClick={() => setDetail(d => !d)} className="text-xs text-violet-600 hover:underline mb-3 block">
        {detail ? 'Show less' : 'Learn more'}
      </button>
      <div className="flex gap-2">
        <button onClick={handleDecline} className="flex-1 px-3 py-2 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
          Essential Only
        </button>
        <button onClick={handleAccept} className="flex-1 px-3 py-2 text-xs font-semibold text-white bg-violet-600 rounded-lg hover:bg-violet-700 transition-colors">
          Accept All
        </button>
      </div>
    </div>
  );
}
