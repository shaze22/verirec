import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';
import { useBillingStore } from '../store/billingStore.js';
import { supabase } from '../lib/supabase.js';
import { getSessions } from '../api/sessions.js';
import { getMyTeam, getTeamMembers } from '../api/teams.js';
import { logEvent } from '../api/auditLog.js';
import { getCounselorProfile, upsertCounselorProfile } from '../api/counselor.js';
import { getSessionReceipt, getStripeInvoices } from '../api/billing.js';
import { getStorageUsage, formatBytes, STORAGE_LIMITS } from '../api/audioLibrary.js';
import { Input, Textarea } from '../components/ui/Input.jsx';
import { TopBar } from '../components/layout/TopBar.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { BillingSettings } from '../components/billing/BillingSettings.jsx';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { user, signOut } = useAuthStore();
  const { fetchSubscription, subscription } = useBillingStore();
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
  const isOrgPlan = subscription?.plan === 'pro' || subscription?.plan === 'biz';
  const [orgName, setOrgName] = useState(() => localStorage.getItem(`org_name_${user?.id}`) || '');
  const [orgNameSaving, setOrgNameSaving] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  const [counselorProfile, setCounselorProfile] = useState(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({});
  const [savingProfile, setSavingProfile] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameForm, setNameForm] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [storageUsed, setStorageUsed] = useState(null);
  const [notifPrefs, setNotifPrefs] = useState(() => ({
    new_appointment: localStorage.getItem('notif_new_appointment') !== 'false',
    session_reminder: localStorage.getItem('notif_session_reminder') !== 'false',
    usage_warning: localStorage.getItem('notif_usage_warning') !== 'false',
  }));
  const [paymentModal, setPaymentModal] = useState(null); // { plan, receiptUrl, amount, created }
  const [receiptLoading, setReceiptLoading] = useState(false);

  const TOPUP_LABELS = { topup_1: 'Top-up 1 Session', topup_5: 'Top-up 5 Sessions', topup_10: 'Top-up 10 Sessions' };
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
      toast.error('Payment cancelled.');
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
      getCounselorProfile(user.id).then(async p => {
        setCounselorProfile(p);
        if (p?.booking_code) {
          const bookingUrl = `${window.location.origin}/book/${p.booking_code}`;
          const QRCode = (await import('qrcode')).default;
          QRCode.toDataURL(bookingUrl, { width: 200, margin: 2, color: { dark: '#1e293b', light: '#ffffff' } })
            .then(url => setQrDataUrl(url)).catch(() => {});
        }
      }).catch(() => {});
      getStorageUsage(user.id).then(setStorageUsed).catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    supabase.auth.mfa.listFactors()
      .then(({ data }) => setMfaFactors(data?.totp || []))
      .catch(() => {})
      .finally(() => setMfaLoading(false));
  }, []);

  useEffect(() => {
    if (!user || !isOrgPlan) return;
    getMyTeam(user.id)
      .then(team => team && getTeamMembers(team.id))
      .then(members => setTeamMembers(members || []))
      .catch(() => {});
  }, [user, isOrgPlan]);

  const handleMfaEnroll = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', issuer: 'VeriRec', friendlyName: 'VeriRec Authenticator' });
      if (error) throw error;
      setEnrollData(data);
      setEnrollCode('');
    } catch (err) {
      toast.error(err.message || 'Failed to start 2FA enrollment.');
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
      toast.success('Two-factor authentication (2FA) successfully enabled!');
      logEvent(user.id, 'mfa.enroll');
    } catch (err) {
      toast.error(err.message?.includes('Invalid') ? 'Invalid code. Please try again.' : (err.message || 'Verification failed.'));
    } finally {
      setEnrollVerifying(false);
    }
  };

  const handleMfaUnenroll = async (factorId) => {
    if (!window.confirm('Disable 2FA? Your account will only be protected by password.')) return;
    setUnenrolling(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;
      setMfaFactors([]);
      toast.success('2FA successfully disabled.');
      logEvent(user.id, 'mfa.unenroll');
    } catch (err) {
      toast.error(err.message || 'Failed to disable 2FA.');
    } finally {
      setUnenrolling(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirm) {
      toast.error('New passwords do not match.');
      return;
    }
    if (pwForm.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters.');
      return;
    }
    setPwLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pwForm.newPassword });
      if (error) throw error;
      toast.success('Password updated successfully.');
      setPwForm({ newPassword: '', confirm: '' });
    } catch (err) {
      toast.error(err.message || 'Failed to update password.');
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
      toast.success('Data exported successfully.');
    } catch {
      toast.error('Failed to export data.');
    } finally {
      setExportLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== user?.email) {
      toast.error('Email does not match.');
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
      toast.success('All your data has been deleted.');
      navigate('/');
    } catch {
      toast.error('Failed to delete data. Contact support at hello@verirec.app.');
      setDeleteModal(false);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleRetentionSave = () => {
    if (retentionDays) {
      localStorage.setItem('retention_days', retentionDays);
      toast.success(`Data retention setting updated: ${retentionDays} hari.`);
    } else {
      localStorage.removeItem('retention_days');
      toast.success('Data retention: Keep forever.');
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <TopBar title="Settings" />

      {/* Payment Success Modal */}
      {paymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-8 text-center">
            {/* Success icon */}
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Payment Successful!</h2>
            <p className="text-gray-500 text-sm mb-5">
              {TOPUP_LABELS[paymentModal.plan] || 'Subscription'} has been credited to your account.
            </p>

            {/* Payment details */}
            <div className="bg-gray-50 rounded-xl p-4 text-left space-y-2 mb-5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Product</span>
                <span className="font-medium">{TOPUP_LABELS[paymentModal.plan] || 'Counselor Subscription'}</span>
              </div>
              {paymentModal.amount && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Amount</span>
                  <span className="font-bold text-gray-900">RM{Number(paymentModal.amount).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Date</span>
                <span className="font-medium">{new Date().toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Status</span>
                <span className="font-semibold text-green-600">✓ Success</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="space-y-2">
              {paymentModal.receiptUrl ? (
                <a
                  href={paymentModal.receiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full bg-green-600 text-white font-semibold py-2.5 rounded-xl hover:bg-green-700 transition-colors text-sm"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download Receipt
                </a>
              ) : (
                <button
                  disabled
                  className="flex items-center justify-center gap-2 w-full bg-gray-100 text-gray-400 font-semibold py-2.5 rounded-xl text-sm cursor-not-allowed"
                >
                  <div className="w-3 h-3 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" />
                  Loading receipt...
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

          {/* Account Profile */}
          <section className="bg-white rounded-xl border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Profile</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Email</span>
                <span className="font-medium">{user?.email}</span>
              </div>
              <div className="flex justify-between items-center gap-3">
                <span className="text-gray-500 flex-shrink-0">Nama</span>
                {editingName ? (
                  <div className="flex items-center gap-2 flex-1 justify-end">
                    <input
                      type="text"
                      value={nameForm}
                      onChange={e => setNameForm(e.target.value)}
                      className="flex-1 max-w-[200px] px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Full name"
                      autoFocus
                    />
                    <Button size="sm" loading={savingName} onClick={async () => {
                      if (!nameForm.trim()) return;
                      setSavingName(true);
                      try {
                        await supabase.auth.updateUser({ data: { full_name: nameForm.trim() } });
                        toast.success('Name updated.');
                        setEditingName(false);
                      } catch { toast.error('Failed to save.'); }
                      finally { setSavingName(false); }
                    }}>Save</Button>
                    <button onClick={() => setEditingName(false)} className="text-gray-400 hover:text-gray-600 text-xs">Cancel</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{user?.user_metadata?.full_name || '—'}</span>
                    <button onClick={() => { setNameForm(user?.user_metadata?.full_name || ''); setEditingName(true); }}
                      className="text-xs text-blue-500 hover:text-blue-700 font-medium">Edit</button>
                  </div>
                )}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">User ID</span>
                <span className="font-mono text-xs text-gray-400">{user?.id?.substring(0, 16)}...</span>
              </div>
            </div>
          </section>

          {/* Counselor Profile */}
          {isCounselor && (
            <section className="bg-white rounded-xl border p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Counselor Profile</h2>
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
                    Edit Profile
                  </Button>
                )}
              </div>

              {editingProfile ? (
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  if (!profileForm.display_name?.trim()) return toast.error('Display name is required.');
                  if (!profileForm.phone?.trim()) return toast.error('Phone number is required.');
                  setSavingProfile(true);
                  try {
                    const updated = { ...counselorProfile, ...profileForm, user_id: user.id };
                    await upsertCounselorProfile(updated);
                    setCounselorProfile(prev => ({ ...prev, ...profileForm }));
                    setEditingProfile(false);
                    toast.success('Profile updated.');
                  } catch (err) {
                    toast.error(err.message || 'Gagal menyimpan.');
                  } finally {
                    setSavingProfile(false);
                  }
                }} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Nama Paparan *</label>
                      <Input value={profileForm.display_name} onChange={e => setProfileForm(f => ({ ...f, display_name: e.target.value }))} placeholder="Your name" required />
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
                      <Input value={profileForm.klinik_name} onChange={e => setProfileForm(f => ({ ...f, klinik_name: e.target.value }))} placeholder="UTM Counseling Unit" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Tempoh Sesi (minit)</label>
                      <Input type="number" min="15" max="180" step="15" value={profileForm.session_duration_minutes} onChange={e => setProfileForm(f => ({ ...f, session_duration_minutes: parseInt(e.target.value) }))} />
                    </div>
                    <div className="flex items-center gap-3 pt-5">
                      <input type="checkbox" id="accepting" checked={profileForm.is_accepting_appointments} onChange={e => setProfileForm(f => ({ ...f, is_accepting_appointments: e.target.checked }))} className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500" />
                      <label htmlFor="accepting" className="text-sm text-gray-700">Accept new bookings</label>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Lokasi / Alamat</label>
                    <Input value={profileForm.klinik_address} onChange={e => setProfileForm(f => ({ ...f, klinik_address: e.target.value }))} placeholder="Block A, Administration Building..." />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Bio Ringkas</label>
                    <Textarea value={profileForm.bio} onChange={e => setProfileForm(f => ({ ...f, bio: e.target.value }))} rows={2} placeholder="Your specialization and experience..." />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button type="submit" loading={savingProfile} size="sm">Save</Button>
                    <Button type="button" variant="secondary" size="sm" onClick={() => setEditingProfile(false)}>Cancel</Button>
                  </div>
                </form>
              ) : counselorProfile ? (
                <div className="space-y-2 text-sm">
                  {[
                    ['Display Name', counselorProfile.display_name],
                    ['Phone', counselorProfile.phone],
                    ['Reg. No.', counselorProfile.registration_number],
                    ['Unit / Clinic', counselorProfile.klinik_name],
                    ['Location', counselorProfile.klinik_address],
                    ['Session Duration', counselorProfile.session_duration_minutes ? `${counselorProfile.session_duration_minutes} min` : null],
                  ].filter(([, v]) => v).map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-4">
                      <span className="text-gray-500 flex-shrink-0">{label}</span>
                      <span className="font-medium text-right">{value}</span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-1 border-t border-gray-50">
                    <span className="text-gray-500">Booking Code</span>
                    <span className="font-mono font-bold text-gray-900">{counselorProfile.booking_code || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Booking Status</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${counselorProfile.is_accepting_appointments ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-500'}`}>
                      {counselorProfile.is_accepting_appointments ? 'Menerima Tempahan' : 'Tidak Menerima'}
                    </span>
                  </div>
                  {counselorProfile.bio && (
                    <div className="pt-1 border-t border-gray-50">
                      <p className="text-gray-500 text-xs mb-1">Bio</p>
                      <p className="text-gray-700">{counselorProfile.bio}</p>
                    </div>
                  )}

                  {/* QR + Booking Link */}
                  {counselorProfile.booking_code && (
                    <div className="pt-3 border-t border-gray-100 space-y-3">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">QR & Pautan Tempahan</p>
                      <div className="flex items-start gap-4">
                        {qrDataUrl && (
                          <img src={qrDataUrl} alt="Booking QR" className="w-20 h-20 rounded-lg border border-gray-200 flex-shrink-0" />
                        )}
                        <div className="flex-1 space-y-2 min-w-0">
                          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                            <span className="text-xs text-gray-500 truncate flex-1">
                              {window.location.origin}/book/{counselorProfile.booking_code}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={async () => {
                                await navigator.clipboard.writeText(`${window.location.origin}/book/${counselorProfile.booking_code}`);
                                setCopied(true);
                                setTimeout(() => setCopied(false), 2000);
                              }}
                              className="flex-1 text-xs font-semibold py-1.5 px-3 rounded-lg border border-emerald-300 text-violet-700 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                            >
                              {copied ? '✓ Copied!' : '📋 Copy Link'}
                            </button>
                            <button
                              onClick={() => navigate('/kaunselor/appointments?tab=slots')}
                              className="flex-1 text-xs font-semibold py-1.5 px-3 rounded-lg border border-gray-200 text-gray-600 bg-white hover:bg-gray-50 transition-colors"
                            >
                              🕐 Time Slots
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500 mb-3">Counselor profile not set up yet.</p>
                  <Button size="sm" onClick={() => {
                    setProfileForm({ display_name: '', phone: '', registration_number: '', klinik_name: '', klinik_address: '', bio: '', session_duration_minutes: 60, is_accepting_appointments: true });
                    setEditingProfile(true);
                  }}>Set Up Profile</Button>
                </div>
              )}
            </section>
          )}

          {/* Storan Audio */}
          {isCounselor && storageUsed !== null && (
            <section className="bg-white rounded-xl border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Audio Recording Storage</h2>
              {(() => {
                const plan = localStorage.getItem('vr_plan') || 'counselor';
                const limit = STORAGE_LIMITS[plan] ?? STORAGE_LIMITS.counselor;
                const pct = Math.min(100, (storageUsed / limit) * 100);
                const color = pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-green-500';
                return (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Used: <strong>{formatBytes(storageUsed)}</strong></span>
                      <span className="text-gray-400">Limit: {formatBytes(limit)}</span>
                    </div>
                    <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-xs text-gray-400">
                      {pct > 90
                        ? '⚠️ Storage almost full. Please delete old recordings in Audio Library.'
                        : `${(100 - pct).toFixed(0)}% space remaining.`}
                    </p>
                  </div>
                );
              })()}
            </section>
          )}

          {/* Custom Report Fields — soal siasat/audit sahaja, bukan kaunselor */}
          {!isCounselor && <section className="bg-white rounded-xl border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Additional Report Fields</h2>
            <p className="text-sm text-gray-500 mb-4">Add custom fields for your organization that will appear during session setup and in PDF reports (e.g.: PDRM Case No., ISO Clause, Halal Certificate No.).</p>
            <div className="space-y-3">
              {[1, 2, 3].map(i => {
                const key = `custom_field_${i}_label`;
                const val = localStorage.getItem(key) || '';
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-sm text-gray-400 w-6 flex-shrink-0">#{i}</span>
                    <input
                      defaultValue={val}
                      placeholder={i === 1 ? 'e.g. PDRM Case No.' : i === 2 ? 'e.g. ISO Clause' : 'e.g. Halal Cert No.'}
                      onBlur={e => {
                        const v = e.target.value.trim();
                        if (v) localStorage.setItem(key, v);
                        else localStorage.removeItem(key);
                      }}
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-gray-400 mt-3">These fields will appear in "Additional Information" during session setup. Values are stored in session records.</p>
          </section>}

          {/* Change Password */}
          <section className="bg-white rounded-xl border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Change Password</h2>
            <form onSubmit={handlePasswordChange} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <input
                  type="password"
                  value={pwForm.newPassword}
                  onChange={e => setPwForm(p => ({ ...p, newPassword: e.target.value }))}
                  placeholder="At least 8 characters"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sahkan New Password</label>
                <input
                  type="password"
                  value={pwForm.confirm}
                  onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))}
                  placeholder="Re-enter new password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <Button type="submit" loading={pwLoading} variant="secondary">Update Password</Button>
            </form>
          </section>

          {/* Pengesahan Dua Faktor */}
          <section className="bg-white rounded-xl border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Two-Factor Authentication (2FA)</h2>
            <p className="text-sm text-gray-500 mb-4">Add an extra layer of security using an authenticator app like Google Authenticator or Authy.</p>

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
                        <p className="text-xs text-green-700">Active · TOTP</p>
                      </div>
                    </div>
                    <Button variant="danger" size="sm" onClick={() => handleMfaUnenroll(f.id)} loading={unenrolling}>
                      Deactivate
                    </Button>
                  </div>
                ))}
              </div>
            ) : enrollData ? (
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <p className="text-sm font-medium text-blue-900 mb-3">1. Scan this QR code with your authenticator app:</p>
                  <div
                    className="flex justify-center mb-3 bg-white p-3 rounded-xl border"
                    dangerouslySetInnerHTML={{ __html: enrollData.totp.qr_code }}
                  />
                  <p className="text-xs text-blue-700 mb-1">Or enter the manual code:</p>
                  <p className="font-mono text-sm text-blue-900 bg-white border rounded px-3 py-2 text-center tracking-widest select-all">
                    {enrollData.totp.secret}
                  </p>
                </div>
                <form onSubmit={handleMfaVerify} className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">2. Enter the 6-digit code from the app to verify:</label>
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
                    <Button type="button" variant="secondary" onClick={() => setEnrollData(null)}>Cancel</Button>
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

          {/* Telegram Notifications */}
          {isCounselor && (
            <section className="bg-white rounded-xl border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Telegram Notifications</h2>
              <p className="text-sm text-gray-500 mb-4">Receive new appointment notifications and tomorrow's reminders directly to your Telegram.</p>
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-4 text-sm text-blue-800 space-y-1">
                <p className="font-semibold">How to set up:</p>
                <ol className="list-decimal list-inside space-y-0.5 text-blue-700 text-xs">
                  <li>Open Telegram → search for <strong>@userinfobot</strong></li>
                  <li>Send any message → bot replies with <strong>Id:</strong> (number)</li>
                  <li>Copy the number and paste it below</li>
                </ol>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Telegram Chat ID</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g.: 123456789"
                      defaultValue={counselorProfile?.telegram_chat_id || ''}
                      id="tg-chat-id"
                      className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                    <Button size="sm" onClick={async () => {
                      const chatId = document.getElementById('tg-chat-id').value.trim();
                      if (!chatId) return;
                      try {
                        await supabase.from('counselor_profiles').update({ telegram_chat_id: chatId }).eq('user_id', user.id);
                        setCounselorProfile(p => ({ ...p, telegram_chat_id: chatId }));
                        toast.success('Chat ID saved.');
                      } catch { toast.error('Failed to save.'); }
                    }}>Save</Button>
                  </div>
                </div>
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium text-gray-800">Enable Telegram notifications</p>
                    <p className="text-xs text-gray-400">Temujanji baru & peringatan esok</p>
                  </div>
                  <button
                    onClick={async () => {
                      const newVal = !counselorProfile?.telegram_enabled;
                      try {
                        await supabase.from('counselor_profiles').update({ telegram_enabled: newVal }).eq('user_id', user.id);
                        setCounselorProfile(p => ({ ...p, telegram_enabled: newVal }));
                        toast.success(newVal ? 'Telegram enabled.' : 'Telegram disabled.');
                      } catch { toast.error('Failed to update.'); }
                    }}
                    className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${counselorProfile?.telegram_enabled ? 'bg-violet-500' : 'bg-gray-200'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${counselorProfile?.telegram_enabled ? 'translate-x-5' : ''}`} />
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* Notifikasi */}
          <section className="bg-white rounded-xl border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Email Notifications</h2>
            <p className="text-sm text-gray-500 mb-4">Choose the types of emails you want to receive.</p>
            <div className="space-y-3">
              {[
                { key: 'new_appointment', label: 'New booking request', desc: 'Email when a client submits a booking' },
                { key: 'session_reminder', label: 'Upcoming session reminder', desc: 'Email 1 hour before session' },
                { key: 'usage_warning', label: 'Usage limit warning', desc: 'Email when sessions almost exhausted (80%)' },
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{label}</p>
                    <p className="text-xs text-gray-400">{desc}</p>
                  </div>
                  <button
                    onClick={() => {
                      const newVal = !notifPrefs[key];
                      setNotifPrefs(p => ({ ...p, [key]: newVal }));
                      localStorage.setItem(`notif_${key}`, String(newVal));
                      toast.success(newVal ? 'Notification enabled.' : 'Notification disabled.');
                    }}
                    className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${notifPrefs[key] ? 'bg-violet-500' : 'bg-gray-200'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${notifPrefs[key] ? 'translate-x-5' : ''}`} />
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Subscription & Usage */}
          <section className="bg-white rounded-xl border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Subscription & Usage</h2>
            <BillingSettings />
          </section>

          {/* Privacy & Data */}
          <section className="bg-white rounded-xl border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Privacy & Data (PDPA 2010)</h2>
            <p className="text-sm text-gray-500 mb-5">You have the right to access, export, or delete your personal data under the Personal Data Protection Act 2010.</p>

            <div className="space-y-4">
              {/* Eksport */}
              <div className="flex items-start justify-between gap-4 p-4 bg-blue-50 rounded-xl">
                <div>
                  <p className="font-medium text-sm text-gray-900">Export All My Data</p>
                  <p className="text-xs text-gray-500 mt-0.5">Download all sessions, reports, and account information in JSON format.</p>
                </div>
                <Button variant="outline" size="sm" loading={exportLoading} onClick={handleExportData}>
                  Export JSON
                </Button>
              </div>

              {/* Pengekalan Data */}
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="font-medium text-sm text-gray-900 mb-1">Data Retention Settings</p>
                <p className="text-xs text-gray-500 mb-3">Sessions older than the set period will be flagged for deletion.</p>
                <div className="flex items-center gap-3">
                  <select
                    value={retentionDays}
                    onChange={e => setRetentionDays(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Keep forever</option>
                    <option value="90">90 days</option>
                    <option value="180">180 days (6 months)</option>
                    <option value="365">365 days (1 year)</option>
                    <option value="730">730 days (2 years)</option>
                  </select>
                  <Button variant="secondary" size="sm" onClick={handleRetentionSave}>Save</Button>
                </div>
              </div>

              {/* Consent Withdrawal */}
              <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
                <p className="font-medium text-sm text-amber-900 mb-1">Consent Withdrawal</p>
                <p className="text-xs text-amber-700 mb-3">
                  To withdraw consent for certain data processing, contact us at{' '}
                  <a href="mailto:privacy@verirec.app" className="underline">privacy@verirec.app</a>.
                  Session consent records cannot be deleted due to PDPA audit requirements.
                </p>
              </div>
            </div>
          </section>

          {/* Referral Program */}
          <section className="bg-white rounded-xl border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Referral Program</h2>
            <p className="text-sm text-gray-500 mb-5">Share VeriRec with colleagues. Every registration through your link counts as a referral.</p>
            <div className="space-y-4">
              <div className="bg-blue-50 rounded-xl p-4">
                <p className="text-xs font-medium text-gray-500 mb-2">Your Referral Link</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-white border border-blue-200 rounded-lg px-3 py-2 text-blue-800 truncate">
                    {window.location.origin}/auth?ref={referralCode}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/auth?ref=${referralCode}`)
                        .then(() => toast.success('Link copied!'))
                        .catch(() => toast.error('Failed to copy.'));
                    }}
                    className="px-3 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors flex-shrink-0"
                  >
                    Salin
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-gray-900">Successful Referrals</p>
                  <p className="text-xs text-gray-500">Users who registered through your link</p>
                </div>
                <span className="text-2xl font-bold text-blue-600">
                  {referralCount === null ? '—' : referralCount}
                </span>
              </div>
            </div>
          </section>

          {/* Organization Management — Pro/Biz sahaja */}
          {isOrgPlan && (
            <section className="bg-white rounded-xl border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Organization Management</h2>
              <p className="text-sm text-gray-500 mb-5">Manage team members and department settings for your Organization Plan.</p>
              <div className="space-y-4">
                {/* Org capacity */}
                <div className="bg-blue-50 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-blue-900">Organization Plan</p>
                    <p className="text-xs text-blue-700 mt-0.5">
                      {teamMembers.filter(m => m.status === 'accepted').length}/5 member slots used · 100 sessions/member/month
                    </p>
                  </div>
                  <button
                    onClick={() => navigate('/team')}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 bg-white border border-blue-200 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Urus Pasukan →
                  </button>
                </div>

                {/* Org name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department / Unit Name</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={orgName}
                      onChange={e => setOrgName(e.target.value)}
                      placeholder="e.g. MACC Investigation Unit KL Branch"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <Button
                      size="sm"
                      loading={orgNameSaving}
                      onClick={() => {
                        setOrgNameSaving(true);
                        localStorage.setItem(`org_name_${user.id}`, orgName);
                        setTimeout(() => {
                          setOrgNameSaving(false);
                          toast.success('Organization name saved.');
                        }, 300);
                      }}
                    >
                      Simpan
                    </Button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Will appear in PDF reports as the organization name.</p>
                </div>

                {/* Team members summary */}
                {teamMembers.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Team Members ({teamMembers.filter(m => m.status === 'accepted').length} active)</p>
                    <div className="space-y-2">
                      {teamMembers.slice(0, 5).map(m => (
                        <div key={m.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg">
                          <span className="text-sm text-gray-700 truncate">{m.email}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ml-2 ${
                            m.status === 'accepted' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {m.status === 'accepted' ? 'Active' : 'Invited'}
                          </span>
                        </div>
                      ))}
                    </div>
                    {teamMembers.length > 5 && (
                      <button onClick={() => navigate('/team')} className="text-xs text-blue-600 hover:underline mt-2">
                        View all {teamMembers.length} ahli →
                      </button>
                    )}
                  </div>
                )}

                {/* Invite prompt if no team yet */}
                {teamMembers.length === 0 && (
                  <div className="text-center py-4 bg-gray-50 rounded-xl">
                    <p className="text-sm text-gray-500 mb-2">No team members invited yet.</p>
                    <button
                      onClick={() => navigate('/team')}
                      className="text-sm font-semibold text-blue-600 hover:text-blue-800"
                    >
                      Invite Team Members →
                    </button>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Delete Account */}
          <section className="bg-white rounded-xl border border-red-200 p-6">
            <h2 className="text-lg font-semibold text-red-700 mb-1">Delete Account</h2>
            <p className="text-sm text-gray-500 mb-4">
              This action will permanently delete all your sessions, reports, and personal data. This action cannot be undone.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type your email to confirm: <span className="font-mono text-gray-400">{user?.email}</span>
                </label>
                <input
                  type="email"
                  value={deleteConfirm}
                  onChange={e => setDeleteConfirm(e.target.value)}
                  placeholder="Enter your email"
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
        title="Final Confirmation"
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
              <p className="text-sm font-semibold text-red-800">This action cannot be undone</p>
              <p className="text-xs text-red-600 mt-0.5">All your sessions, reports, transcripts, and personal data will be permanently deleted.</p>
            </div>
          </div>
          <p className="text-sm text-gray-600">
            Account to be deleted: <strong className="text-gray-900">{user?.email}</strong>
          </p>
          <p className="text-xs text-gray-400">PDPA consent records will be retained for 7 years as required by legal audit requirements.</p>
        </div>
      </Modal>
    </div>
  );
}
