import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateConsentId } from '../lib/crypto.js';
import { supabase } from '../lib/supabase.js';
import { useAuthStore } from '../store/authStore.js';
import { useBillingStore } from '../store/billingStore.js';
import { Button } from '../components/ui/Button.jsx';
import toast from 'react-hot-toast';

const CONSENT_VERSION = 'VERIREC-CONSENT-v1.0';

const CONSENT_ITEMS = [
  'Saya memahami bahawa sesi rakaman ini akan dirakam (audio) dan ditranskripsikan.',
  'Saya bersetuju bahawa rakaman dan transkrip akan digunakan untuk tujuan profesional yang dinyatakan.',
  'Saya faham bahawa maklumat peribadi saya dilindungi di bawah Akta Perlindungan Data Peribadi 2010 (PDPA).',
  'Saya bersetuju untuk meneruskan sesi ini dengan sukarela dan boleh berhenti pada bila-bila masa.',
];

export default function ConsentPage() {
  const { user } = useAuthStore();
  const { incrementUsage } = useBillingStore();
  const navigate = useNavigate();
  const [checked, setChecked] = useState([false, false, false, false]);
  const [loading, setLoading] = useState(false);

  // Parsed once — sessionStorage never changes during component lifetime
  const setup = useMemo(() => JSON.parse(sessionStorage.getItem('session_setup') || '{}'), []);

  // Stable timestamp — same value displayed and stored in consent record
  const [consentTimestamp] = useState(() => new Date().toISOString());

  // If subject already has signed consent, skip the form and proceed directly
  const [autoChecking, setAutoChecking] = useState(!!setup.subject_id);

  useEffect(() => {
    if (!setup.subject_name || !setup.profession) {
      navigate('/session/new', { replace: true });
    }
  }, [setup, navigate]);

  useEffect(() => {
    if (!setup.subject_id || !user?.id) { setAutoChecking(false); return; }
    (async () => {
      try {
        const { data } = await supabase
          .from('subjects').select('consent_signed').eq('id', setup.subject_id).single();
        if (data?.consent_signed) {
          const ts = new Date().toISOString();
          const consentData = {
            id: generateConsentId(), version: CONSENT_VERSION, timestamp: ts,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            items: CONSENT_ITEMS, subject_name: setup.subject_name,
            interviewer: setup.interviewer, profession: setup.profession,
            user_id: user.id, auto_skipped: true,
          };
          const { data: session, error } = await supabase.from('sessions')
            .insert({
              user_id: user.id, title: setup.title, profession: setup.profession,
              interviewer: setup.interviewer, subject_name: setup.subject_name,
              subject_role: setup.subject_role, case_number: setup.case_number || null,
              witness_officer: setup.witness_officer || null,
              other_officers: setup.other_officers || null,
              context_notes: setup.context_notes,
              consent_signed: true, consent_data: consentData,
              ...(setup.case_id ? { case_id: setup.case_id } : {}),
            })
            .select().single();
          if (error) throw error;
          await incrementUsage().catch(() => {});
          sessionStorage.setItem('active_session_id', session.id);
          navigate('/session/active', { replace: true });
        } else {
          setAutoChecking(false);
        }
      } catch {
        setAutoChecking(false);
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const allChecked = checked.every(Boolean);
  const toggle = (i) => setChecked(prev => prev.map((v, idx) => idx === i ? !v : v));

  const handleConsent = async () => {
    if (!allChecked) return;
    setLoading(true);
    try {
      const consentData = {
        id: generateConsentId(),
        version: CONSENT_VERSION,
        timestamp: consentTimestamp,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        items: CONSENT_ITEMS,
        subject_name: setup.subject_name,
        interviewer: setup.interviewer,
        profession: setup.profession,
        user_id: user?.id,
      };

      const { data: session, error } = await supabase
        .from('sessions')
        .insert({
          user_id: user.id,
          title: setup.title,
          profession: setup.profession,
          interviewer: setup.interviewer,
          subject_name: setup.subject_name,
          subject_role: setup.subject_role,
          case_number: setup.case_number || null,
          witness_officer: setup.witness_officer || null,
          other_officers: setup.other_officers || null,
          context_notes: setup.context_notes,
          consent_signed: true,
          consent_data: consentData,
          ...(setup.case_id ? { case_id: setup.case_id } : {}),
        })
        .select()
        .single();

      if (error) throw error;

      await incrementUsage().catch(() => {});
      sessionStorage.setItem('active_session_id', session.id);
      navigate('/session/active');
    } catch (err) {
      console.error('consent error:', err);
      toast.error(err.message || 'Gagal menyimpan persetujuan. Cuba lagi.');
    } finally {
      setLoading(false);
    }
  };

  if (autoChecking) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-500">Menyemak maklumat klien...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-2xl w-full p-8">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">📋</div>
          <h1 className="text-2xl font-bold text-gray-900">Borang Persetujuan Maklum</h1>
          <p className="text-gray-500 mt-2">Sila baca dan tandakan setiap perkara di bawah sebelum sesi bermula</p>
        </div>

        <div className="bg-blue-50 rounded-xl p-4 mb-6">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-gray-500">Pengendali Sesi:</span> <span className="font-medium">{setup.interviewer}</span></div>
            <div><span className="text-gray-500">Subjek:</span> <span className="font-medium">{setup.subject_name}</span></div>
            <div><span className="text-gray-500">Sesi:</span> <span className="font-medium">{setup.title}</span></div>
            <div><span className="text-gray-500">Tarikh:</span> <span className="font-medium">{new Date(consentTimestamp).toLocaleDateString('ms-MY')}</span></div>
          </div>
        </div>

        <div className="space-y-4 mb-8">
          {CONSENT_ITEMS.map((item, i) => (
            <div key={i} className="flex items-start gap-3 cursor-pointer" onClick={() => toggle(i)}>
              <div className={`w-5 h-5 rounded flex-shrink-0 border-2 flex items-center justify-center mt-0.5 transition-colors ${
                checked[i] ? 'bg-blue-600 border-blue-600' : 'border-gray-300 hover:border-blue-400'
              }`}>
                {checked[i] && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className={`text-sm leading-relaxed select-none ${checked[i] ? 'text-gray-800' : 'text-gray-600'}`}>{item}</span>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => navigate(-1)}>Kembali</Button>
          <Button
            className="flex-1"
            disabled={!allChecked}
            loading={loading}
            onClick={handleConsent}
          >
            Saya Bersetuju — Mulakan Sesi
          </Button>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Versi persetujuan: {CONSENT_VERSION} •{' '}
          {new Date(consentTimestamp).toLocaleString('ms-MY', {
            day: 'numeric', month: 'long', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
          })}
        </p>
      </div>
    </div>
  );
}
