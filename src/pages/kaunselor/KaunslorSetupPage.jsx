import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore.js';
import { getCounselorProfile, upsertCounselorProfile, generateBookingCode, CREDENTIALS_OPTIONS, SPECIALIZATIONS_OPTIONS } from '../../api/counselor.js';
import { Button } from '../../components/ui/Button.jsx';
import { Input, Textarea } from '../../components/ui/Input.jsx';
import { TopBar } from '../../components/layout/TopBar.jsx';
import toast from 'react-hot-toast';

function Tag({ label, selected, onToggle }) {
  return (
    <button type="button" onClick={onToggle}
      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${selected ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}>
      {label}
    </button>
  );
}

export default function KaunslorSetupPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    display_name: '',
    phone: '',
    registration_number: '',
    credentials: [],
    specializations: [],
    practice_type: 'solo',
    klinik_name: '',
    klinik_address: '',
    bio: '',
    session_duration_minutes: 60,
    is_accepting_appointments: true,
    booking_code: '',
  });

  useEffect(() => {
    if (!user) return;
    getCounselorProfile(user.id).then(p => {
      if (p) {
        setForm(f => ({ ...f, ...p }));
      } else {
        setForm(f => ({
          ...f,
          display_name: user.user_metadata?.full_name || '',
          booking_code: generateBookingCode(),
        }));
      }
    }).finally(() => setLoading(false));
  }, [user]);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const toggleTag = (key, val) => setForm(f => ({
    ...f,
    [key]: f[key].includes(val) ? f[key].filter(x => x !== val) : [...f[key], val],
  }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.display_name.trim()) return toast.error('Sila masukkan nama paparan.');
    if (!form.phone.trim()) return toast.error('Sila masukkan nombor telefon.');
    if (form.credentials.length === 0) return toast.error('Pilih sekurang-kurangnya satu kelayakan.');
    setSaving(true);
    try {
      await upsertCounselorProfile({ ...form, user_id: user.id });
      toast.success('Profil kaunselor disimpan!');
      navigate('/kaunselor/clients');
    } catch (err) {
      toast.error(err.message || 'Gagal menyimpan profil.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="flex flex-col h-screen">
      <TopBar title="Persediaan Profil Kaunselor" />
      <div className="flex-1 overflow-auto p-6 pb-20 md:pb-6">
        <div className="max-w-2xl mx-auto space-y-6">

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800 flex items-start justify-between gap-3">
            <span><strong>Selamat datang ke VeriRec Counselor Module.</strong> Lengkapkan profil anda untuk mula menerima temujanji daripada klien.</span>
            <button type="button" onClick={() => { localStorage.setItem(`counselor_setup_skipped_${user?.id}`, '1'); navigate('/dashboard'); }}
              className="text-xs text-blue-500 hover:text-blue-700 flex-shrink-0 underline">Skip</button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Personal info */}
            <div className="bg-white rounded-xl border p-5 space-y-4">
              <h3 className="font-semibold text-gray-900">Maklumat Peribadi</h3>
              <Input label="Nama Paparan *" value={form.display_name} onChange={set('display_name')} placeholder="Nama yang akan dilihat oleh klien" required />
              <Input label="Nombor Telefon / WhatsApp *" value={form.phone} onChange={set('phone')} type="tel" placeholder="cth. 012-3456789" required />
              <Input label="Nombor Pendaftaran" value={form.registration_number} onChange={set('registration_number')} placeholder="cth. BKR/0123/2024" />
              <Textarea label="Bio / Tentang Saya" value={form.bio} onChange={set('bio')} rows={3} placeholder="Perkenalan ringkas tentang pengalaman dan pendekatan kaunseling anda..." />
            </div>

            {/* Practice type */}
            <div className="bg-white rounded-xl border p-5 space-y-4">
              <h3 className="font-semibold text-gray-900">Lokasi & Jenis Amalan</h3>
              <div className="grid grid-cols-2 gap-3">
                {[{ val: 'solo', label: '👤 Solo Practitioner', desc: 'Amalan persendirian' }, { val: 'klinik', label: '🏥 Klinik / Pusat', desc: 'Ada admin / receptionist' }].map(opt => (
                  <button key={opt.val} type="button"
                    onClick={() => setForm(f => ({ ...f, practice_type: opt.val }))}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${form.practice_type === opt.val ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <div className="font-medium text-sm">{opt.label}</div>
                    <div className="text-xs text-gray-500 mt-1">{opt.desc}</div>
                  </button>
                ))}
              </div>
              {form.practice_type === 'klinik' && (
                <Input label="Nama Klinik / Pusat" value={form.klinik_name} onChange={set('klinik_name')} placeholder="cth. Klinik Kaunseling Bestari" />
              )}
              <Textarea label="Alamat / Lokasi Sesi *" value={form.klinik_address} onChange={set('klinik_address')} rows={2} placeholder="Alamat tempat sesi kaunseling dijalankan (akan dipaparkan kepada klien dalam e-mel pengesahan)..." />
              <p className="text-xs text-gray-400">Maklumat ini akan dipaparkan dalam e-mel pengesahan temujanji klien.</p>
            </div>

            {/* Credentials */}
            <div className="bg-white rounded-xl border p-5 space-y-3">
              <h3 className="font-semibold text-gray-900">Kelayakan *</h3>
              <div className="flex flex-wrap gap-2">
                {CREDENTIALS_OPTIONS.map(c => (
                  <Tag key={c} label={c} selected={form.credentials.includes(c)} onToggle={() => toggleTag('credentials', c)} />
                ))}
              </div>
            </div>

            {/* Specializations */}
            <div className="bg-white rounded-xl border p-5 space-y-3">
              <h3 className="font-semibold text-gray-900">Kepakaran</h3>
              <div className="flex flex-wrap gap-2">
                {SPECIALIZATIONS_OPTIONS.map(s => (
                  <Tag key={s} label={s} selected={form.specializations.includes(s)} onToggle={() => toggleTag('specializations', s)} />
                ))}
              </div>
            </div>

            {/* Session settings */}
            <div className="bg-white rounded-xl border p-5 space-y-4">
              <h3 className="font-semibold text-gray-900">Tetapan Sesi</h3>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Tempoh Sesi (minit)</label>
                <select value={form.session_duration_minutes} onChange={e => setForm(f => ({ ...f, session_duration_minutes: +e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {[30, 45, 60, 90, 120].map(m => <option key={m} value={m}>{m} minit</option>)}
                </select>
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="accepting" checked={form.is_accepting_appointments}
                  onChange={e => setForm(f => ({ ...f, is_accepting_appointments: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 rounded" />
                <label htmlFor="accepting" className="text-sm text-gray-700">Menerima temujanji baru daripada klien</label>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Kod Tempahan Anda</p>
                <p className="font-mono font-bold text-gray-900 text-lg">{form.booking_code}</p>
                <p className="text-xs text-gray-400 mt-1">URL: www.verirec.app/book/{form.booking_code}</p>
              </div>
            </div>

            <Button type="submit" className="w-full" size="lg" loading={saving}>
              Simpan & Teruskan ke Jadual Temujanji →
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
