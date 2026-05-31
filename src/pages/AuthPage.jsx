import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import { useAuthStore } from '../store/authStore.js';
import { professionLabel as getProfessionLabel } from '../data/professions.js';
import { Button } from '../components/ui/Button.jsx';
import { Input } from '../components/ui/Input.jsx';
import { isCounselorSubdomain, isDoctorSubdomain, isJKMSubdomain } from '../lib/subdomain.js';
import toast from 'react-hot-toast';

// Detect Supabase password recovery redirect (hash fragment)
function detectRecoverySession() {
  const hash = window.location.hash;
  if (hash.includes('type=recovery') || hash.includes('type%3Drecovery')) return true;
  const params = new URLSearchParams(window.location.search);
  return params.get('type') === 'recovery';
}

function Logo({ counselor, doctor }) {
  const color = counselor ? '#10b981' : '#2563eb';
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="w-10 h-10 mx-auto mb-3">
      <rect width="32" height="32" rx="8" fill={color}/>
      <polyline points="4,16 7,11 10,21 13,9 16,23 19,11 22,18 25,14 28,16"
        stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}

function PasswordField({ label, value, onChange, placeholder, minLength, show, onToggle, required }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          minLength={minLength}
          required={required}
          className="w-full px-3 py-2 pr-10 rounded-lg border border-gray-300 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          tabIndex={-1}
          aria-label={show ? 'Sembunyikan kata laluan' : 'Tunjukkan kata laluan'}
        >
          {show ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

export default function AuthPage() {
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState(() => {
    if (detectRecoverySession()) return 'reset';
    return searchParams.get('mode') === 'register' ? 'register' : 'login';
  });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [mfaState, setMfaState] = useState(null); // { factorId }
  const [mfaCode, setMfaCode] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const counselorSubdomain = isCounselorSubdomain();
  const doctorSubdomain    = isDoctorSubdomain();
  const jkmSubdomain       = isJKMSubdomain();
  const subdomainProfession = counselorSubdomain ? 'counselor' : doctorSubdomain ? 'doctor' : jkmSubdomain ? 'jkm' : null;
  const professionFromUrl = subdomainProfession ?? searchParams.get('profession');
  const professionLabel = getProfessionLabel(professionFromUrl);
  const postAuthRoute = counselorSubdomain ? '/kaunselor/clients' : doctorSubdomain ? '/doktor/clients' : jkmSubdomain ? '/jkm/clients' : '/dashboard';

  // Redirect when user is set (covers OAuth callback timing)
  useEffect(() => {
    if (user && mode !== 'reset') navigate(postAuthRoute);
  }, [user, mode, navigate]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setMode('reset');
    });
    return () => subscription.unsubscribe();
  }, []);

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Kata laluan tidak sepadan.');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Kata laluan mestilah sekurang-kurangnya 8 aksara.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('Kata laluan berjaya dikemas kini!');
      navigate(postAuthRoute);
    } catch (err) {
      toast.error(err.message || 'Gagal mengemas kini kata laluan. Cuba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (subdomainProfession) localStorage.setItem('preferred_profession', subdomainProfession);
        // Check if MFA is required
        const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (aal?.nextLevel === 'aal2' && aal?.currentLevel !== 'aal2') {
          const { data: factors } = await supabase.auth.mfa.listFactors();
          const totp = factors?.totp?.[0];
          if (totp) { setMfaState({ factorId: totp.id }); return; }
        }
        navigate(postAuthRoute);
      } else if (mode === 'register') {
        const { data: signUpData, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } },
        });
        if (error) throw error;
        if (professionFromUrl) {
          localStorage.setItem('preferred_profession', professionFromUrl);
        }
        if (signUpData?.session?.access_token) {
          // Email confirmation disabled — user is immediately logged in
          fetch('/api/user-notifications?type=welcome', {
            method: 'POST',
            headers: { Authorization: `Bearer ${signUpData.session.access_token}` },
          }).catch(() => {});
          toast.success('Selamat datang ke VeriRec!');
          navigate(postAuthRoute);
        } else {
          // Email confirmation enabled — ask user to check inbox
          toast.success('Akaun berjaya dibuat! Sila semak e-mel untuk pengesahan.');
        }
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth`,
        });
        if (error) throw error;
        toast.success('Pautan reset kata laluan telah dihantar ke e-mel anda.');
        setMode('login');
      }
    } catch (err) {
      const msgs = {
        'Invalid login credentials': 'E-mel atau kata laluan tidak sah.',
        'Email not confirmed': 'Sila sahkan e-mel anda dahulu.',
        'User already registered': 'E-mel ini sudah didaftarkan.',
      };
      toast.error(msgs[err.message] || err.message || 'Ralat berlaku. Cuba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleMfaSubmit = async (e) => {
    e.preventDefault();
    if (!mfaState || mfaCode.length !== 6) return;
    setMfaLoading(true);
    try {
      const { data: challenge, error: ce } = await supabase.auth.mfa.challenge({ factorId: mfaState.factorId });
      if (ce) throw ce;
      const { error: ve } = await supabase.auth.mfa.verify({ factorId: mfaState.factorId, challengeId: challenge.id, code: mfaCode });
      if (ve) throw ve;
      navigate(postAuthRoute);
    } catch {
      toast.error('Kod tidak sah. Cuba lagi.');
      setMfaCode('');
    } finally {
      setMfaLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    if (subdomainProfession) localStorage.setItem('preferred_profession', subdomainProfession);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth` },
      });
      if (error) throw error;
    } catch (err) {
      toast.error(err.message || 'Gagal log masuk dengan Google. Cuba lagi.');
      setLoading(false);
    }
  };

  if (mode === 'reset') {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${counselorSubdomain ? 'bg-gradient-to-br from-emerald-900 to-teal-900' : 'bg-gradient-to-br from-blue-900 to-gray-900'}`}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
          <div className="text-center mb-8">
            <Logo counselor={counselorSubdomain} />
            <h1 className="text-2xl font-bold text-gray-900">VeriRec</h1>
            <h2 className="text-lg font-semibold text-gray-900 mt-4">Tetapkan Kata Laluan Baru</h2>
            <p className="text-sm text-gray-500 mt-1">Masukkan kata laluan baru anda di bawah.</p>
          </div>
          <form onSubmit={handlePasswordReset} className="space-y-4">
            <PasswordField
              label="Kata Laluan Baru"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Minimum 8 aksara"
              minLength={8}
              show={showNewPassword}
              onToggle={() => setShowNewPassword(v => !v)}
              required
            />
            <PasswordField
              label="Sahkan Kata Laluan"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Ulang kata laluan baru"
              show={showConfirmPassword}
              onToggle={() => setShowConfirmPassword(v => !v)}
              required
            />
            <Button type="submit" className="w-full" size="lg" loading={loading}>
              Kemas Kini Kata Laluan
            </Button>
          </form>
        </div>
      </div>
    );
  }

  if (mfaState) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${counselorSubdomain ? 'bg-gradient-to-br from-emerald-900 to-teal-900' : 'bg-gradient-to-br from-blue-900 to-gray-900'}`}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center">
          <Logo counselor={counselorSubdomain} />
          <h1 className="text-2xl font-bold text-gray-900 mb-1">VeriRec</h1>
          <h2 className="text-lg font-semibold text-gray-900 mt-4 mb-2">Pengesahan Dua Faktor</h2>
          <p className="text-sm text-gray-500 mb-6">Masukkan kod 6-digit dari aplikasi pengesah anda.</p>
          <form onSubmit={handleMfaSubmit} className="space-y-4">
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={mfaCode}
              onChange={e => setMfaCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="w-full text-center text-3xl tracking-widest px-4 py-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <Button type="submit" className="w-full" size="lg" loading={mfaLoading} disabled={mfaCode.length !== 6}>
              Sahkan
            </Button>
            <button type="button" onClick={() => { supabase.auth.signOut(); setMfaState(null); }} className="text-sm text-gray-400 hover:text-gray-600">
              ← Kembali ke Log Masuk
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${counselorSubdomain ? 'bg-gradient-to-br from-emerald-900 to-teal-900' : 'bg-gradient-to-br from-blue-900 to-gray-900'}`}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <Logo counselor={counselorSubdomain} />
          <h1 className="text-2xl font-bold text-gray-900">VeriRec</h1>
          <p className="text-gray-500 mt-1 text-sm">
            {counselorSubdomain ? 'Portal Kaunselor' : 'Platform Rakaman Sesi Profesional'}
          </p>
          {professionLabel && mode === 'register' && (
            <div className="mt-3 inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 text-xs font-medium px-3 py-1.5 rounded-full">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Akaun untuk {professionLabel}
            </div>
          )}
        </div>

        {mode !== 'forgot' && (
          <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
            <button
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${mode === 'login' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
              onClick={() => setMode('login')}
            >
              Log Masuk
            </button>
            <button
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${mode === 'register' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
              onClick={() => setMode('register')}
            >
              Daftar
            </button>
          </div>
        )}

        {mode === 'forgot' && (
          <div className="mb-6">
            <h2 className="font-semibold text-gray-900 text-center">Reset Kata Laluan</h2>
            <p className="text-sm text-gray-500 text-center mt-1">Masukkan e-mel anda dan kami akan hantar pautan reset.</p>
          </div>
        )}

        {mode !== 'forgot' && (
          <>
            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Teruskan dengan Google
            </button>

            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-3 text-gray-400">atau guna e-mel</span>
              </div>
            </div>
          </>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <Input
              label="Nama Penuh"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Masukkan nama penuh anda"
              required
            />
          )}
          <Input
            label="E-mel"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="contoh@email.com"
            required
          />
          {mode !== 'forgot' && (
            <PasswordField
              label="Kata Laluan"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={mode === 'register' ? 'Minimum 8 aksara' : 'Kata laluan anda'}
              minLength={mode === 'register' ? 8 : undefined}
              show={showPassword}
              onToggle={() => setShowPassword(v => !v)}
              required
            />
          )}
          <Button type="submit" className="w-full" size="lg" loading={loading}>
            {mode === 'login' ? 'Log Masuk' : mode === 'register' ? 'Buat Akaun' : 'Hantar Pautan Reset'}
          </Button>
        </form>

        {mode === 'login' && (
          <div className="text-center mt-4">
            <button onClick={() => setMode('forgot')} className="text-sm text-blue-600 hover:underline">
              Lupa kata laluan?
            </button>
          </div>
        )}

        {mode === 'forgot' && (
          <div className="text-center mt-4">
            <button onClick={() => setMode('login')} className="text-sm text-gray-500 hover:text-gray-700">
              ← Kembali ke Log Masuk
            </button>
          </div>
        )}

        <p className="text-center text-xs text-gray-400 mt-6">
          Dengan mendaftar, anda bersetuju dengan{' '}
          <button className="underline">Dasar Privasi</button>{' '}
          dan{' '}
          <button className="underline">Terma Penggunaan</button>{' '}
          VeriRec
        </p>

        <div className="text-center mt-4">
          <button
            onClick={() => window.location.href = '/'}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            ← Kembali ke laman utama
          </button>
        </div>
      </div>
    </div>
  );
}
