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
    <div className="fixed bottom-0 left-0 right-0 z-50 shadow-2xl">
      <div className="bg-white border-t border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-start gap-3 flex-1">
              <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Privacy &amp; Cookies</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  We use essential cookies (login, security) and optional analytics cookies (Google Analytics) to improve our service.{' '}
                  <button onClick={() => setDetail(d => !d)} className="text-blue-600 hover:underline">
                    {detail ? 'Show less' : 'Learn more'}
                  </button>
                  {' '}·{' '}
                  <a href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</a>
                </p>
                {detail && (
                  <div className="mt-2 space-y-1.5">
                    <div className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full mt-1.5 flex-shrink-0" />
                      <p className="text-xs text-gray-600"><strong>Essential Cookies</strong> — Login, session, CSRF security. Always active, required for the app to function.</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-1.5 flex-shrink-0" />
                      <p className="text-xs text-gray-600"><strong>Analytics (optional)</strong> — Google Analytics helps us understand how users use VeriRec. No personal data is shared.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0 sm:ml-4">
              <button
                onClick={handleDecline}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Essential Only
              </button>
              <button
                onClick={handleAccept}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Accept All
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
