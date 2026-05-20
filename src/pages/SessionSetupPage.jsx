import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';
import { getProfession } from '../data/professions.js';
import { TopBar } from '../components/layout/TopBar.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Input, Textarea } from '../components/ui/Input.jsx';

export default function SessionSetupPage() {
  const { profession: professionId } = useParams();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const profession = getProfession(professionId);

  const [form, setForm] = useState({
    title: '',
    interviewer: user?.user_metadata?.full_name || '',
    subject_name: '',
    subject_role: '',
    context_notes: '',
  });

  const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    sessionStorage.setItem('session_setup', JSON.stringify({ ...form, profession: professionId }));
    navigate('/session/consent');
  };

  if (!profession) return <p className="p-6 text-red-500">Profesion tidak dijumpai.</p>;

  return (
    <div className="flex flex-col h-screen">
      <TopBar title={`Persediaan Sesi — ${profession.label}`} />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto bg-white rounded-xl border p-6">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b">
            <span className="text-3xl">{profession.icon}</span>
            <div>
              <h2 className="font-semibold text-gray-900">{profession.label}</h2>
              <p className="text-sm text-gray-500">{profession.frameworks.join(' • ')}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Tajuk Sesi *"
              value={form.title}
              onChange={set('title')}
              placeholder="cth. Sesi Kaunseling #001"
              required
            />
            <Input
              label="Nama Penemuduga *"
              value={form.interviewer}
              onChange={set('interviewer')}
              placeholder="Nama anda"
              required
            />
            <Input
              label="Nama Subjek *"
              value={form.subject_name}
              onChange={set('subject_name')}
              placeholder="Nama orang yang ditemuduga"
              required
            />
            <Input
              label="Peranan/Jawatan Subjek"
              value={form.subject_role}
              onChange={set('subject_role')}
              placeholder="cth. Klien, Saksi, Tertuduh"
            />
            <Textarea
              label="Nota Konteks"
              value={form.context_notes}
              onChange={set('context_notes')}
              rows={3}
              placeholder="Latar belakang kes, tujuan temuduga, maklumat relevan lain..."
            />
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => navigate(-1)}>Kembali</Button>
              <Button type="submit" className="flex-1">Teruskan ke Persetujuan</Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
