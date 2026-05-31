import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore.js';
import { getCounselorProfile, upsertCounselorProfile, generateBookingCode } from '../../api/counselor.js';
import { getProfFromPath } from '../../lib/profConfig.js';
import { Button } from '../../components/ui/Button.jsx';
import { Input, Textarea } from '../../components/ui/Input.jsx';
import { TopBar } from '../../components/layout/TopBar.jsx';
import toast from 'react-hot-toast';

const CREDENTIALS = {
  counselor: ['Kaunselor Berdaftar (BKR)', 'Kaunselor Pelajar Berdaftar (BKPP)', 'M.Sc. Kaunseling', 'M.Ed. Kaunseling', 'Ph.D. Kaunseling', 'Diploma Kaunseling'],
  doctor:    ['MBBS', 'MD', 'MBChB', 'Doktor Perubatan (UM)', 'Pakar Perunding', 'Fellow (Specialist)', 'Master Perubatan'],
  jkm:       ['Diploma Kebajikan Masyarakat', 'B.Sc. Kerja Sosial', 'M.Sc. Kerja Sosial', 'Pegawai Kebajikan Masyarakat', 'Penolong Pegawai Kebajikan Masyarakat'],
};

const SPECIALIZATIONS = {
  counselor: ['Keluarga & Perkahwinan', 'Kanak-kanak & Remaja', 'Kemurungan & Kebimbangan', 'Kerjaya & Akademik', 'Trauma & PTSD', 'Keganasan Rumah Tangga', 'Krisis & Pencegahan Bunuh Diri'],
  doctor:    ['Perubatan Am', 'Pediatrik', 'Obstetrik & Ginekologi', 'Psikiatri', 'Perubatan Dalaman', 'Pembedahan', 'Ortopedik', 'Dermatologi', 'Kardiologi', 'Neurologi'],
  jkm:       ['Kebajikan Kanak-kanak', 'Kebajikan Warga Emas', 'Kebajikan OKU', 'Keganasan Rumah Tangga', 'Kemiskinan & Bantuan Sara Hidup', 'Pemulihan Sosial', 'Perlindungan Kanak-kanak'],
};

function Tag({ label, selected, onToggle }) {
  return (
    <button type="button" onClick={onToggle}
      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${selected ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}>
      {label}
    </button>
  );
}

export default function ProfSetupPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const prof = getProfFromPath(pathname);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    display_name: '', phone: '', registration_number: '', credentials: [],
    specializations: [], practice_type: 'solo', klinik_name: '', klinik_address: '',
    bio: '', session_duration_minutes: 60, is_accepting_appointments: true, booking_code: '',
  });

  useEffect(() => {
    if (!user) return;
    getCounselorProfile(user.id).then(p => {
      if (p) setForm(f => ({ ...f, ...p }));
      else setForm(f => ({ ...f, display_name: user.user_metadata?.full_name || '', booking_code: generateBookingCode() }));
    }).finally(() => setLoading(false));
  }, [user]);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const toggleTag = (key, val) => setForm(f => ({
    ...f, [key]: f[key].includes(val) ? f[key].filter(x => x !== val) : [...f[key], val],
  }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.display_name.trim()) return toast.error('Sila masukkan nama paparan.');
    if (!form.phone.trim()) return toast.error('Sila masukkan nombor telefon.');
    setSaving(true);
    try {
      await upsertCounselorProfile({ ...form, user_id: user.id });
      toast.success(`${prof.setupLabel} disimpan!`);
      navigate(`${prof.routePrefix}/clients`);
    } catch (err) {
      toast.error(err.message || 'Gagal menyimpan profil.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;

  const creds = CREDENTIALS[prof.profession] || CREDENTIALS.counselor;
  const specs  = SPECIALIZATIONS[prof.profession] || SPECIALIZATIONS.counselor;

  return (
    <div className="flex flex-col h-screen">
      <TopBar title={`Persediaan ${prof.setupLabel}`} />
      <div className="flex-1 overflow-auto p-6 pb-20 md:pb-6">
        <div className="max-w-2xl mx-auto space-y-6">

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800 flex items-start justify-between gap-3">
            <span><strong>Selamat datang ke VeriRec {prof.label} Portal.</strong> Lengkapkan profil anda untuk mula menerima {prof.appointmentsLabel.toLowerCase()} daripada {prof.clientsLabel.toLowerCase()}.</span>
            <button type="button" onClick={() => navigate(`${prof.routePrefix}/clients`)}
              className="text-xs text-blue-500 hover:text-blue-700 flex-shrink-0 underline">Skip</button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white rounded-xl border p-5 space-y-4">
              <h3 className="font-semibold text-gray-900">Maklumat Peribadi</h3>
              <Input label="Nama Paparan *" value={form.display_name} onChange={set('display_name')} placeholder={`Nama ${prof.label} yang akan dilihat`} required />
              <Input label="Nombor Telefon *" value={form.phone} onChange={set('phone')} type="tel" placeholder="cth. 012-3456789" required />
              <Input label={prof.registrationLabel} value={form.registration_number} onChange={set('registration_number')} placeholder="Nombor pendaftaran profesional" />
              <Textarea label="Bio / Tentang Saya" value={form.bio} onChange={set('bio')} rows={3} placeholder={`Perkenalan ringkas tentang ${prof.label}...`} />
            </div>

            <div className="bg-white rounded-xl border p-5 space-y-4">
              <h3 className="font-semibold text-gray-900">Lokasi & Jenis Amalan</h3>
              <div className="grid grid-cols-2 gap-3">
                {[{ val: 'solo', label: '👤 Solo', desc: 'Amalan persendirian' }, { val: 'klinik', label: '🏥 ' + prof.unitLabel, desc: 'Ada pasukan / kakitangan' }].map(opt => (
                  <button key={opt.val} type="button" onClick={() => setForm(f => ({ ...f, practice_type: opt.val }))}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${form.practice_type === opt.val ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <div className="font-medium text-sm">{opt.label}</div>
                    <div className="text-xs text-gray-500 mt-1">{opt.desc}</div>
                  </button>
                ))}
              </div>
              {form.practice_type === 'klinik' && (
                <Input label={`Nama ${prof.unitLabel}`} value={form.klinik_name} onChange={set('klinik_name')} placeholder={`cth. ${prof.unitLabel} Bestari`} />
              )}
              <Textarea label="Alamat / Lokasi *" value={form.klinik_address} onChange={set('klinik_address')} rows={2} placeholder="Alamat lengkap tempat sesi dijalankan..." />
            </div>

            <div className="bg-white rounded-xl border p-5 space-y-3">
              <h3 className="font-semibold text-gray-900">{prof.credentialsLabel}</h3>
              <div className="flex flex-wrap gap-2">
                {creds.map(c => <Tag key={c} label={c} selected={form.credentials.includes(c)} onToggle={() => toggleTag('credentials', c)} />)}
              </div>
            </div>

            <div className="bg-white rounded-xl border p-5 space-y-3">
              <h3 className="font-semibold text-gray-900">{prof.specializationLabel}</h3>
              <div className="flex flex-wrap gap-2">
                {specs.map(s => <Tag key={s} label={s} selected={form.specializations.includes(s)} onToggle={() => toggleTag('specializations', s)} />)}
              </div>
            </div>

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
                  onChange={e => setForm(f => ({ ...f, is_accepting_appointments: e.target.checked }))} className="w-4 h-4 text-blue-600 rounded" />
                <label htmlFor="accepting" className="text-sm text-gray-700">Menerima {prof.appointmentLabel.toLowerCase()} baru</label>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Kod Tempahan Anda</p>
                <p className="font-mono font-bold text-gray-900 text-lg">{form.booking_code}</p>
                <p className="text-xs text-gray-400 mt-1">URL: www.verirec.app/book/{form.booking_code}</p>
              </div>
            </div>

            <Button type="submit" className="w-full" size="lg" loading={saving}>
              Simpan & Teruskan →
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
