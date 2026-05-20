import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import { Button } from '../components/ui/Button.jsx';
import { Input } from '../components/ui/Input.jsx';
import toast from 'react-hot-toast';

export default function AuthPage() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate('/dashboard');
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } },
        });
        if (error) throw error;
        toast.success('Semak e-mel anda untuk pengesahan akaun.');
      }
    } catch (err) {
      const msgs = {
        'Invalid login credentials': 'E-mel atau kata laluan tidak sah.',
        'Email not confirmed': 'Sila sahkan e-mel anda dahulu.',
        'User already registered': 'E-mel ini sudah didaftarkan.',
      };
      toast.error(msgs[err.message] || 'Ralat berlaku. Cuba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-gray-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-600">VeriRec</h1>
          <p className="text-gray-500 mt-1 text-sm">Platform Rakaman Temuduga Profesional</p>
        </div>

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
          <Input
            label="Kata Laluan"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder={mode === 'register' ? 'Minimum 8 aksara' : 'Kata laluan anda'}
            minLength={mode === 'register' ? 8 : undefined}
            required
          />
          <Button type="submit" className="w-full" size="lg" loading={loading}>
            {mode === 'login' ? 'Log Masuk' : 'Buat Akaun'}
          </Button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          Dengan mendaftar, anda bersetuju dengan Dasar Privasi dan Terma Penggunaan VeriRec
        </p>
      </div>
    </div>
  );
}
