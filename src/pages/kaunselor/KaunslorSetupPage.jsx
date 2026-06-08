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
    payment_url: '',
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
    if (!form.display_name.trim()) return toast.error('Please enter a display name.');
    if (!form.phone.trim()) return toast.error('Please enter a phone number.');
    if (form.credentials.length === 0) return toast.error('Select at least one credential.');
    setSaving(true);
    try {
      await upsertCounselorProfile({ ...form, user_id: user.id });
      toast.success('Counselor profile saved!');
      navigate('/kaunselor/clients');
    } catch (err) {
      toast.error(err.message || 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="flex flex-col h-screen">
      <TopBar title="Counselor Profile Setup" />
      <div className="flex-1 overflow-auto p-6 pb-20 md:pb-6">
        <div className="max-w-2xl mx-auto space-y-6">

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800 flex items-start justify-between gap-3">
            <span><strong>Welcome to Kaunselor.</strong> Complete your profile to start accepting appointments from clients.</span>
            <button type="button" onClick={() => { localStorage.setItem(`counselor_setup_skipped_${user?.id}`, '1'); navigate('/dashboard'); }}
              className="text-xs text-blue-500 hover:text-blue-700 flex-shrink-0 underline">Skip</button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Personal info */}
            <div className="bg-white rounded-xl border p-5 space-y-4">
              <h3 className="font-semibold text-gray-900">Personal Information</h3>
              <Input label="Display Name *" value={form.display_name} onChange={set('display_name')} placeholder="Name that will be shown to clients" required />
              <Input label="Phone / WhatsApp Number *" value={form.phone} onChange={set('phone')} type="tel" placeholder="e.g. 012-3456789" required />
              <Input label="Registration Number" value={form.registration_number} onChange={set('registration_number')} placeholder="e.g. BKR/0123/2024" />
              <Textarea label="Bio / About Me" value={form.bio} onChange={set('bio')} rows={3} placeholder="Brief introduction about your experience and counseling approach..." />
            </div>

            {/* Practice type */}
            <div className="bg-white rounded-xl border p-5 space-y-4">
              <h3 className="font-semibold text-gray-900">Location & Practice Type</h3>
              <div className="grid grid-cols-2 gap-3">
                {[{ val: 'solo', label: '👤 Solo Practitioner', desc: 'Private practice' }, { val: 'klinik', label: '🏥 Clinic / Center', desc: 'Has admin / receptionist' }].map(opt => (
                  <button key={opt.val} type="button"
                    onClick={() => setForm(f => ({ ...f, practice_type: opt.val }))}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${form.practice_type === opt.val ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <div className="font-medium text-sm">{opt.label}</div>
                    <div className="text-xs text-gray-500 mt-1">{opt.desc}</div>
                  </button>
                ))}
              </div>
              {form.practice_type === 'klinik' && (
                <Input label="Clinic / Center Name" value={form.klinik_name} onChange={set('klinik_name')} placeholder="e.g. Bestari Counseling Clinic" />
              )}
              <Textarea label="Session Address / Location *" value={form.klinik_address} onChange={set('klinik_address')} rows={2} placeholder="Address where counseling sessions are held (will be shown to clients in confirmation emails)..." />
              <p className="text-xs text-gray-400">This information will be shown in client appointment confirmation emails.</p>
            </div>

            {/* Credentials */}
            <div className="bg-white rounded-xl border p-5 space-y-3">
              <h3 className="font-semibold text-gray-900">Credentials *</h3>
              <div className="flex flex-wrap gap-2">
                {CREDENTIALS_OPTIONS.map(c => (
                  <Tag key={c} label={c} selected={form.credentials.includes(c)} onToggle={() => toggleTag('credentials', c)} />
                ))}
              </div>
            </div>

            {/* Specializations */}
            <div className="bg-white rounded-xl border p-5 space-y-3">
              <h3 className="font-semibold text-gray-900">Specializations</h3>
              <div className="flex flex-wrap gap-2">
                {SPECIALIZATIONS_OPTIONS.map(s => (
                  <Tag key={s} label={s} selected={form.specializations.includes(s)} onToggle={() => toggleTag('specializations', s)} />
                ))}
              </div>
            </div>

            {/* Session settings */}
            <div className="bg-white rounded-xl border p-5 space-y-4">
              <h3 className="font-semibold text-gray-900">Session Settings</h3>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Session Duration (minutes)</label>
                <select value={form.session_duration_minutes} onChange={e => setForm(f => ({ ...f, session_duration_minutes: +e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {[30, 45, 60, 90, 120].map(m => <option key={m} value={m}>{m} minutes</option>)}
                </select>
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="accepting" checked={form.is_accepting_appointments}
                  onChange={e => setForm(f => ({ ...f, is_accepting_appointments: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 rounded" />
                <label htmlFor="accepting" className="text-sm text-gray-700">Accepting new appointments from clients</label>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Your Booking Code</p>
                <p className="font-mono font-bold text-gray-900 text-lg">{form.booking_code}</p>
                <p className="text-xs text-gray-400 mt-1">URL: kaunselor.app/book/{form.booking_code}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Online Payment Link</label>
                <Input value={form.payment_url || ''} onChange={set('payment_url')}
                  placeholder="https://buy.stripe.com/... or any payment link" />
                <p className="text-xs text-gray-400 mt-1">Clients will see a "Pay Now" button in their portal linking here.</p>
              </div>
            </div>

            <Button type="submit" className="w-full" size="lg" loading={saving}>
              Save &amp; Continue to Appointments →
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
