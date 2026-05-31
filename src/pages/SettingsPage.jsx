import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';
import { useBillingStore } from '../store/billingStore.js';
import { supabase } from '../lib/supabase.js';
import { getSessions } from '../api/sessions.js';
import { logEvent } from '../api/auditLog.js';
import { getCounselorProfile, upsertCounselorProfile } from '../api/counselor.js';
import { getSessionReceipt, getStripeInvoices } from '../api/billing.js';
import { Input, Textarea } from '../components/ui/Input.jsx';
import { TopBar } from '../components/layout/TopBar.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { BillingSettings } from '../components/billing/BillingSettings.jsx';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { user, signOut } = useAuthStore();
  const { fetchSubscription } = useBillingStore();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [pwForm, setPwForm] = useState({ newPassword: '', confirm: '' });
  const [pwLoading, setPwLoading] = useState(false);

  // 2FA state
  const [mfaFactors, setMfaFactors] = useState([]);
  const [mfaLoading, setMfaLoading] = useState(true);
  const [enrollData, setEnrollData] = useState(null);
  const [enrollCode, setEnrollCode] = useState('');
  const [enrollVerifying, setEnrollVerifying] = useState(false);
  const [unenrolling, setUnenrolling] = useState(false);

  const [exportLoading, setExportLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [retentionDays, setRetentionDays] = useState(() => localStorage.getItem('retention_days') || '');
  const [referralCount, setReferralCount] = useState(null);
  const referralCode = user?.id?.replace(/-/g, '').slice(0, 10);
  const isCounselor = localStorage.getItem('preferred_profession') === 'counselor';
  const [counselorProfile, setCounselorProfile] = useState(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({});
  const [savingProfile, setSavingProfile] = useState(false);
  const [paymentModal, setPaymentModal] = useState(null); // { plan, receiptUrl, amount, created }
  const [receiptLoading, setReceiptLoading] = useState(false);

  const TOPUP_LABELS = { topup_1: 'Top-up 1 Sesi', topup_5: 'Top-up 5 Sesi', topup_10: 'Top-up 10 Sesi' };
  const TOPUP_AMOUNTS = { topup_1: 13, topup_5: 60, topup_10: 100 };

  useEffect(() => {
    const payment = searchParams.get('payment');
    const plan = searchParams.get('plan');
    const sessionId = searchParams.get('session_id');
    if (payment === 'success') {
      if (user) fetchSubscription(user.id);
      // Show payment success modal
      const isTopup = plan in TOPUP_LABELS;
      setPaymentModal({ plan, sessionId, amount: TOPUP_AMOUNTS[plan] || null, receiptUrl: null });
      // Fetch receipt in background — try session first, fallback to latest charge
      const fetchReceipt = async () => {
        try {
          if (sessionId) {
            const data = await getSessionReceipt(sessionId);
            if (data?.receipt_url) {
              setPaymentModal(prev => prev ? { ...prev, receiptUrl: data.receipt_url, amount: data.amount ? data.amount / 100 : prev.amount } : prev);
              return;
            }
          }
          // Fallback: get latest charge receipt
          const { charges } = await getStripeInvoices();
          const latest = charges?.[0];
          if (latest?.receipt_url) {
            setPaymentModal(prev => prev ? { ...prev, receiptUrl: latest.receipt_url, amount: latest.amount ? latest.amount / 100 : prev.amount } : prev);
          }
        } catch { /* silent fail — user can use Urus Langganan */ }
      };
      fetchReceipt();
    } else if (payment === 'cancelled') {
      toast.error('Pembayaran dibatalkan.');
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    supabase.from('referrals')
      .select('id', { count: 'exact', head: true })
      .eq('referrer_id', user.id)
      .eq('status', 'completed')
      .then(({ count }) => setReferralCount(count || 0))
      .catch(() => {});
    if (isCounselor) {
      getCounselorProfile(user.id).then(p => setCounselorProfile(p)).catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    supabase.auth.mfa.listFactors()
      .then(({ data }) => setMfaFactors(data?.totp || []))
      .catch(() => {})
      .finally(() => setMfaLoading(false));
  }, []);

  const handleMfaEnroll = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', issuer: 'VeriRec', friendlyName: 'VeriRec Authenticator' });
      if (error) throw error;
      setEnrollData(data);
      setEnrollCode('');
    } catch (err) {
      toast.error(err.message || 'Gagal memulakan pendaftaran 2FA.');
    }
  };

  const handleMfaVerify = async (e) => {
    e.preventDefault();
    if (!enrollCode || !enrollData) return;
    setEnrollVerifying(true);
    try {
      const { data: challenge, error: ce } = await supabase.auth.mfa.challenge({ factorId: enrollData.id });
      if (ce) throw ce;
      const { error: ve } = await supabase.auth.mfa.verify({ factorId: enrollData.id, challengeId: challenge.id, code: enrollCode });
      if (ve) throw ve;
      setMfaFactors([{ id: enrollData.id, factor_type: 'totp', status: 'verified', friendly_name: 'VeriRec Authenticator' }]);
      setEnrollData(null);
      setEnrollCode('');
      toast.success('Pengesahan dua faktor (2FA) berjaya diaktifkan!');
      logEvent(user.id, 'mfa.enroll');
    } catch (err) {
      toast.error(err.message?.includes('Invalid') ? 'Kod tidak sah. Cuba lagi.' : (err.message || 'Pengesahan gagal.'));
    } finally {
      setEnrollVerifying(false);
    }
  };

  const handleMfaUnenroll = async (factorId) => {
    if (!window.confirm('Nyahaktifkan 2FA? Akaun anda hanya akan dilindungi oleh kata laluan sahaja.')) return;
    setUnenrolling(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;
      setMfaFactors([]);
      toast.success('2FA berjaya dinyahaktifkan.');
      logEvent(user.id, 'mfa.unenroll');
    } catch (err) {
      toast.error(err.message || 'Gagal menyahaktifkan 2FA.');
    } finally {
      setUnenrolling(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirm) {
      toast.error('Kata laluan baharu tidak sepadan.');
      return;
    }
    if (pwForm.newPassword.length < 8) {
      toast.error('Kata laluan mesti sekurang-kurangnya 8 aksara.');
      return;
    }
    setPwLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pwForm.newPassword });
      if (error) throw error;
      toast.success('Kata laluan berjaya dikemas kini.');
      setPwForm({ newPassword: '', confirm: '' });
    } catch (err) {
      toast.error(err.message || 'Gagal mengemas kini kata laluan.');
    } finally {
      setPwLoading(false);
    }
  };

  const handleExportData = async () => {
    setExportLoading(true);
    try {
      const sessions = await getSessions(user.id);
      const exportData = {
        exported_at: new Date().toISOString(),
        user: { id: user.id, email: user.email, created_at: user.created_at },
        sessions,
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `verirec-data-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Data berjaya dieksport.');
    } catch {
      toast.error('Gagal mengeksport data.');
    } finally {
      setExportLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== user?.email) {
      toast.error('E-mel tidak sepadan.');
      return;
    }
    setDeleteModal(true);
  };

  const confirmDeleteAccount = async () => {
    setDeleteLoading(true);
    try {
      await supabase.from('sessions').delete().eq('user_id', user.id);
      await supabase.from('subscriptions').delete().eq('user_id', user.id);
      await signOut();
      toast.success('Semua data anda telah dipadam.');
      navigate('/');
    } catch {
      toast.error('Gagal memadamkan data. Hubungi sokongan di hello@verirec.app.');
      setDeleteModal(false);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleRetentionSave = () => {
    if (retentionDays) {
      localStorage.setItem('retention_days', retentionDays);
      toast.success(`Tetapan pengekalan data dikemas kini: ${retentionDays} hari.`);
    } else {
      localStorage.removeItem('retention_days');
      toast.success('Pengekalan data: Simpan selama-lamanya.');
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <TopBar title="Tetapan" />

      {/* Payment Success Modal */}
      {paymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-8 text-center">
            {/* Success icon */}
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Pembayaran Berjaya!</h2>
            <p className="text-gray-500 text-sm mb-5">
              {TOPUP_LABELS[paymentModal.plan] || 'Langganan'} telah dikreditkan ke akaun anda.
            </p>

            {/* Payment details */}
            <div className="bg-gray-50 rounded-xl p-4 text-left space-y-2 mb-5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Produk</span>
                <span className="font-medium">{TOPUP_LABELS[paymentModal.plan] || 'Langganan Kaunselor'}</span>
              </div>
              {paymentModal.amount && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Jumlah</span>
                  <span className="font-bold text-gray-900">RM{Number(paymentModal.amount).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Tarikh</span>
                <span className="font-medium">{new Date().toLocaleDateString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Status</span>
                <span className="font-semibold text-emerald-600">✓ Berjaya</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="space-y-2">
              {paymentModal.receiptUrl ? (
                <a
                  href={paymentModal.receiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full bg-emerald-600 text-white font-semibold py-2.5 rounded-xl hover:bg-emerald-700 transition-colors text-sm"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Muat Turun Resit
                </a>
              ) : (
                <button
                  disabled
                  className="flex items-center justify-center gap-2 w-full bg-gray-100 text-gray-400 font-semibold py-2.5 rounded-xl text-sm cursor-not-allowed"
                >
                  <div className="w-3 h-3 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" />
                  Memuat resit...
                </button>
              )}
              <button
                onClick={() => setPaymentModal(null)}
                className="w-full text-gray-500 hover:text-gray-700 font-medium py-2 text-sm transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="flex-1 overflow-auto p-6 pb-20 md:pb-6">
        <div className="max-w-2xl mx-auto space-y-8">

          {/* Profil Akaun */}
          <section className="bg-white rounded-xl border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Profil Akaun</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">E-mel</span>
                <span className="font-medium">{user?.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Nama</span>
                <span className="font-medium">{user?.user_metadata?.full_name || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">ID Pengguna</span>
                <span className="font-mono text-xs text-gray-400">{user?.id?.substring(0, 16)}...</span>
              </div>
            </div>
          </section>

          {/* Profil Kaunselor */}
          {isCounselor && (
            <section className="bg-white rounded-xl border p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Profil Kaunselor</h2>
                {!editingProfile && (
                  <Button variant="secondary" size="sm" onClick={() => {
                    setProfileForm({
                      display_name: counselorProfile?.display_name || '',
                      phone: counselorProfile?.phone || '',
                      registration_number: counselorProfile?.registration_number || '',
                      klinik_name: counselorProfile?.klinik_name || '',
                      klinik_address: counselorProfile?.klinik_address || '',
                      bio: counselorProfile?.bio || '',
                      session_duration_minutes: counselorProfile?.session_duration_minutes || 60,
                      is_accepting_appointments: counselorProfile?.is_accepting_appointments ?? true,
                    });
                    setEditingProfile(true);
                  }}>
                    Edit Profil
                  </Button>
                )}
              </div>

              {editingProfile ? (
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  if (!profileForm.display_name?.trim()) return toast.error('Nama paparan diperlukan.');
                  if (!profileForm.phone?.trim()) return toast.error('Nombor telefon diperlukan.');
                  setSavingProfile(true);
                  try {
                    const updated = { ...counselorProfile, ...profileForm, user_id: user.id };
                    await upsertCounselorProfile(updated);
                    setCounselorProfile(prev => ({ ...prev, ...profileForm }));
                    setEditingProfile(false);
                    toast.success('Profil dikemaskini.');
                  } catch (err) {
                    toast.error(err.message || 'Gagal menyimpan.');
                  } finally {
                    setSavingProfile(false);
                  }
                }} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Nama Paparan *</label>
                      <Input value={profileForm.display_name} onChange={e => setProfileForm(f => ({ ...f, display_name: e.target.value }))} placeholder="Nama anda" required />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">No. Telefon *</label>
                      <Input value={profileForm.phone} onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))} placeholder="01X-XXXXXXX" required />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">No. Pendaftaran</label>
                      <Input value={profileForm.registration_number} onChange={e => setProfileForm(f => ({ ...f, registration_number: e.target.value }))} placeholder="KB/00000/2020" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Nama Unit / Klinik</label>
                      <Input value={profileForm.klinik_name} onChange={e => setProfileForm(f => ({ ...f, klinik_name: e.target.value }))} placeholder="Unit Kaunseling UTM" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Tempoh Sesi (minit)</label>
                      <Input type="number" min="15" max="180" step="15" value={profileForm.session_duration_minutes} onChange={e => setProfileForm(f => ({ ...f, session_duration_minutes: parseInt(e.target.value) }))} />
                    </div>
                    <div className="flex items-center gap-3 pt-5">
                      <input type="checkbox" id="accepting" checked={profileForm.is_accepting_appointments} onChange={e => setProfileForm(f => ({ ...f, is_accepting_appointments: e.target.checked }))} className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                      <label htmlFor="accepting" className="text-sm text-gray-700">Terima tempahan baharu</label>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Lokasi / Alamat</label>
                    <Input value={profileForm.klinik_address} onChange={e => setProfileForm(f => ({ ...f, klinik_address: e.target.value }))} placeholder="Blok A, Bangunan Pentadbiran..." />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Bio Ringkas</label>
                    <Textarea value={profileForm.bio} onChange={e => setProfileForm(f => ({ ...f, bio: e.target.value }))} rows={2} placeholder="Pengkhususan dan pengalaman anda..." />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button type="submit" loading={savingProfile} size="sm">Simpan</Button>
                    <Button type="button" variant="secondary" size="sm" onClick={() => setEditingProfile(false)}>Batal</Button>
                  </div>
                </form>
              ) : counselorProfile ? (
                <div className="space-y-2 text-sm">
                  {[
                    ['Nama Paparan', counselorProfile.display_name],
                    ['Telefon', counselorProfile.phone],
                    ['No. Pendaftaran', counselorProfile.registration_number],
                    ['Unit / Klinik', counselorProfile.klinik_name],
                    ['Lokasi', counselorProfile.klinik_address],
                    ['Tempoh Sesi', counselorProfile.session_duration_minutes ? `${counselorProfile.session_duration_minutes} minit` : null],
                  ].filter(([, v]) => v).map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-4">
                      <span className="text-gray-500 flex-shrink-0">{label}</span>
                      <span className="font-medium text-right">{value}</span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-1 border-t border-gray-50">
                    <span className="text-gray-500">Kod Tempahan</span>
                    <span className="font-mono font-bold text-gray-900">{counselorProfile.booking_code || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Status Tempahan</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${counselorProfile.is_accepting_appointments ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                      {counselorProfile.is_accepting_appointments ? 'Menerima Tempahan' : 'Tidak Menerima'}
                    </span>
                  </div>
                  {counselorProfile.bio && (
                    <div className="pt-1 border-t border-gray-50">
                      <p className="text-gray-500 text-xs mb-1">Bio</p>
                      <p className="text-gray-700">{counselorProfile.bio}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500 mb-3">Profil kaunselor belum disediakan.</p>
                  <Button size="sm" onClick={() => {
                    setProfileForm({ display_name: '', phone: '', registration_number: '', klinik_name: '', klinik_address: '', bio: '', session_duration_minutes: 60, is_accepting_appointments: true });
                    setEditingProfile(true);
                  }}>Sediakan Profil</Button>
                </div>
              )}
            </section>
          )}

          {/* Tukar Kata Laluan */}
          <section className="bg-white rounded-xl border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Tukar Kata Laluan</h2>
            <form onSubmit={handlePasswordChange} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kata Laluan Baharu</label>
                <input
                  type="password"
                  value={pwForm.newPassword}
                  onChange={e => setPwForm(p => ({ ...p, newPassword: e.target.value }))}
                  placeholder="Sekurang-kurangnya 8 aksara"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sahkan Kata Laluan Baharu</label>
                <input
                  type="password"
                  value={pwForm.confirm}
                  onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))}
                  placeholder="Masukkan semula kata laluan baharu"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <Button type="submit" loading={pwLoading} variant="secondary">Kemas Kini Kata Laluan</Button>
            </form>
          </section>

          {/* Pengesahan Dua Faktor */}
          <section className="bg-white rounded-xl border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Pengesahan Dua Faktor (2FA)</h2>
            <p className="text-sm text-gray-500 mb-4">Tambah lapisan keselamatan tambahan menggunakan aplikasi pengesah seperti Google Authenticator atau Authy.</p>

            {mfaLoading ? (
              <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
            ) : mfaFactors.length > 0 ? (
              <div className="space-y-3">
                {mfaFactors.map(f => (
                  <div key={f.id} className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-green-900">{f.friendly_name || 'Authenticator App'}</p>
                        <p className="text-xs text-green-700">Aktif · TOTP</p>
                      </div>
                    </div>
                    <Button variant="danger" size="sm" onClick={() => handleMfaUnenroll(f.id)} loading={unenrolling}>
                      Nyahaktifkan
                    </Button>
                  </div>
                ))}
              </div>
            ) : enrollData ? (
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <p className="text-sm font-medium text-blue-900 mb-3">1. Imbas kod QR ini dengan aplikasi pengesah anda:</p>
                  <div
                    className="flex justify-center mb-3 bg-white p-3 rounded-xl border"
                    dangerouslySetInnerHTML={{ __html: enrollData.totp.qr_code }}
                  />
                  <p className="text-xs text-blue-700 mb-1">Atau masukkan kod manual:</p>
                  <p className="font-mono text-sm text-blue-900 bg-white border rounded px-3 py-2 text-center tracking-widest select-all">
                    {enrollData.totp.secret}
                  </p>
                </div>
                <form onSubmit={handleMfaVerify} className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">2. Masukkan kod 6-digit dari aplikasi untuk mengesahkan:</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={enrollCode}
                      onChange={e => setEnrollCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      className="w-full text-center text-2xl tracking-widest px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button type="button" variant="secondary" onClick={() => setEnrollData(null)}>Batal</Button>
                    <Button type="submit" className="flex-1" loading={enrollVerifying} disabled={enrollCode.length !== 6}>
                      Aktifkan 2FA
                    </Button>
                  </div>
                </form>
              </div>
            ) : (
              <Button onClick={handleMfaEnroll}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Aktifkan 2FA
              </Button>
            )}
          </section>

          {/* Langganan & Penggunaan */}
          <section className="bg-white rounded-xl border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Langganan & Penggunaan</h2>
            <BillingSettings />
          </section>

          {/* PDPA — Eksport & Privasi */}
          <section className="bg-white rounded-xl border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Privasi & Data (PDPA 2010)</h2>
            <p className="text-sm text-gray-500 mb-5">Anda mempunyai hak untuk mengakses, mengeksport, atau memadamkan data peribadi anda di bawah Akta Perlindungan Data Peribadi 2010.</p>

            <div className="space-y-4">
              {/* Eksport */}
              <div className="flex items-start justify-between gap-4 p-4 bg-blue-50 rounded-xl">
                <div>
                  <p className="font-medium text-sm text-gray-900">Eksport Semua Data Saya</p>
                  <p className="text-xs text-gray-500 mt-0.5">Muat turun semua sesi, laporan, dan maklumat akaun dalam format JSON.</p>
                </div>
                <Button variant="outline" size="sm" loading={exportLoading} onClick={handleExportData}>
                  Eksport JSON
                </Button>
              </div>

              {/* Pengekalan Data */}
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="font-medium text-sm text-gray-900 mb-1">Tetapan Pengekalan Data</p>
                <p className="text-xs text-gray-500 mb-3">Sesi yang lebih lama daripada tempoh yang ditetapkan akan diberi peringatan untuk dipadam.</p>
                <div className="flex items-center gap-3">
                  <select
                    value={retentionDays}
                    onChange={e => setRetentionDays(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Simpan selama-lamanya</option>
                    <option value="90">90 hari</option>
                    <option value="180">180 hari (6 bulan)</option>
                    <option value="365">365 hari (1 tahun)</option>
                    <option value="730">730 hari (2 tahun)</option>
                  </select>
                  <Button variant="secondary" size="sm" onClick={handleRetentionSave}>Simpan</Button>
                </div>
              </div>

              {/* Penarikan Kebenaran */}
              <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
                <p className="font-medium text-sm text-amber-900 mb-1">Penarikan Semula Kebenaran</p>
                <p className="text-xs text-amber-700 mb-3">
                  Untuk menarik balik kebenaran pemprosesan data tertentu, hubungi kami di{' '}
                  <a href="mailto:privacy@verirec.app" className="underline">privacy@verirec.app</a>.
                  Rekod persetujuan sesi tidak boleh dipadam kerana keperluan audit PDPA.
                </p>
              </div>
            </div>
          </section>

          {/* Program Rujukan */}
          <section className="bg-white rounded-xl border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Program Rujukan</h2>
            <p className="text-sm text-gray-500 mb-5">Kongsi VeriRec dengan rakan sejawat. Setiap pendaftaran melalui pautan anda dikira sebagai rujukan.</p>
            <div className="space-y-4">
              <div className="bg-blue-50 rounded-xl p-4">
                <p className="text-xs font-medium text-gray-500 mb-2">Pautan Rujukan Anda</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-white border border-blue-200 rounded-lg px-3 py-2 text-blue-800 truncate">
                    {window.location.origin}/auth?ref={referralCode}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/auth?ref=${referralCode}`)
                        .then(() => toast.success('Pautan disalin!'))
                        .catch(() => toast.error('Gagal menyalin.'));
                    }}
                    className="px-3 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors flex-shrink-0"
                  >
                    Salin
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-gray-900">Rujukan Berjaya</p>
                  <p className="text-xs text-gray-500">Pengguna yang mendaftar melalui pautan anda</p>
                </div>
                <span className="text-2xl font-bold text-blue-600">
                  {referralCount === null ? '—' : referralCount}
                </span>
              </div>
            </div>
          </section>

          {/* Padam Akaun */}
          <section className="bg-white rounded-xl border border-red-200 p-6">
            <h2 className="text-lg font-semibold text-red-700 mb-1">Padam Akaun</h2>
            <p className="text-sm text-gray-500 mb-4">
              Tindakan ini akan memadamkan semua sesi, laporan, dan data peribadi anda secara kekal. Tindakan ini tidak boleh dibatalkan.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Taip e-mel anda untuk mengesahkan: <span className="font-mono text-gray-400">{user?.email}</span>
                </label>
                <input
                  type="email"
                  value={deleteConfirm}
                  onChange={e => setDeleteConfirm(e.target.value)}
                  placeholder="Masukkan e-mel anda"
                  className="w-full px-3 py-2 border border-red-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <Button
                variant="danger"
                onClick={handleDeleteAccount}
                disabled={deleteConfirm !== user?.email}
              >
                Padam Semua Data & Akaun
              </Button>
            </div>
          </section>

        </div>
      </div>

      {/* Delete confirmation Modal */}
      <Modal
        open={deleteModal}
        onClose={() => !deleteLoading && setDeleteModal(false)}
        title="Pengesahan Akhir"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setDeleteModal(false)} disabled={deleteLoading}>
              Batal
            </Button>
            <Button variant="danger" onClick={confirmDeleteAccount} loading={deleteLoading}>
              Ya, Padam Semua Data
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-red-50 rounded-xl border border-red-100">
            <svg className="w-6 h-6 text-red-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-red-800">Tindakan ini tidak boleh dibatalkan</p>
              <p className="text-xs text-red-600 mt-0.5">Semua sesi, laporan, transkrip, dan data peribadi anda akan dipadam selama-lamanya.</p>
            </div>
          </div>
          <p className="text-sm text-gray-600">
            Akaun yang akan dipadam: <strong className="text-gray-900">{user?.email}</strong>
          </p>
          <p className="text-xs text-gray-400">Rekod persetujuan PDPA akan dikekalkan selama 7 tahun mengikut keperluan audit undang-undang.</p>
        </div>
      </Modal>
    </div>
  );
}
