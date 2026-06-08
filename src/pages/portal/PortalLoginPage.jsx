import { useState } from 'react';
import { supabase } from '../../lib/supabase.js';
import toast from 'react-hot-toast';

export default function PortalLoginPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: { emailRedirectTo: `${window.location.origin}/portal/home` },
      });
      if (error) throw error;
      setSent(true);
    } catch (err) {
      toast.error(err.message || 'Failed to send login link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-violet-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="w-9 h-9">
            <rect width="32" height="32" rx="8" fill="#8b5cf6"/>
            <polyline points="4,16 7,11 10,21 13,9 16,23 19,11 22,18 25,14 28,16"
              stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          </svg>
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-none">Kaunselor</h1>
            <p className="text-xs text-violet-600">Client Portal</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border p-8">
          {!sent ? (
            <>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Sign In</h2>
              <p className="text-sm text-gray-500 mb-6">Enter your email to receive a login link.</p>
              <form onSubmit={handleSend} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@email.com"
                    required
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm transition-colors disabled:opacity-50"
                >
                  {loading ? 'Sending…' : 'Send Login Link'}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-4">
              <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-gray-900 mb-2">Check your email</h2>
              <p className="text-sm text-gray-500">We sent a login link to <strong>{email}</strong>. Click it to sign in.</p>
              <button
                onClick={() => setSent(false)}
                className="mt-4 text-xs text-violet-600 hover:text-violet-800"
              >
                Use a different email
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          This portal is for clients of your counselor. If you are a counselor,{' '}
          <a href="/auth" className="text-violet-600 hover:underline">sign in here</a>.
        </p>
      </div>
    </div>
  );
}
