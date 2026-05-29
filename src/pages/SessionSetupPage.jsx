import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';
import { getProfession } from '../data/professions.js';
import { TopBar } from '../components/layout/TopBar.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Input, Textarea } from '../components/ui/Input.jsx';
import { SubjectPicker } from '../components/session/SubjectPicker.jsx';

const hasData = (form) =>
  form.title || form.subject_name || form.subject_role || form.context_notes || form.case_number || form.witness_officer || form.subject_id;

function Tooltip({ text }) {
  return (
    <span className="ml-1 inline-flex items-center cursor-help group relative">
      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span className="absolute left-5 -top-1 z-10 hidden group-hover:block w-56 bg-gray-800 text-white text-xs rounded-lg px-3 py-2 shadow-lg pointer-events-none">
        {text}
      </span>
    </span>
  );
}

function LabelWithTooltip({ label, tooltip, required }) {
  return (
    <span className="flex items-center text-sm font-medium text-gray-700 mb-1">
      {label}{required && ' *'}
      {tooltip && <Tooltip text={tooltip} />}
    </span>
  );
}

const professionCaseFields = {
  police:    { caseLabel: 'Nombor Laporan Polis',      casePlaceholder: 'cth. P/TLNG/000123/2026',  witnessLabel: 'Pegawai Penyiasat / Saksi' },
  sprm:      { caseLabel: 'Nombor Kes SPRM',            casePlaceholder: 'cth. SPRM/2026/000123',    witnessLabel: 'Pegawai Pendakwa' },
  hr:        { caseLabel: 'Nombor Kes Tatatertib',      casePlaceholder: 'cth. HR/ID/2026/001',      witnessLabel: 'Pegawai HR / Saksi Periksa' },
  iso:       { caseLabel: 'Nombor Audit',               casePlaceholder: 'cth. AUDIT/ISO/2026-Q2',   witnessLabel: 'Wakil Auditee' },
  doctor:    { caseLabel: 'Nombor Pendaftaran Pesakit', casePlaceholder: 'cth. P-2026-001234',        witnessLabel: 'Jururawat / Staf Bertugas' },
  counselor: { caseLabel: 'Nombor Kes Kaunseling',      casePlaceholder: 'cth. KSL/2026/001',        witnessLabel: 'Penyelia / Kaunselor Rujukan' },
  court:     { caseLabel: 'Nombor Kes Mahkamah',        casePlaceholder: 'cth. MA-22NCC-XXX-2026',   witnessLabel: 'Peguam Bertentangan / Hakim' },
  peguam:    { caseLabel: 'Nombor Fail Kes',             casePlaceholder: 'cth. PG/2026/001234',       witnessLabel: 'Rakan Kongsi / Penyelia Kes' },
  jkm:       { caseLabel: 'Nombor Kes Kebajikan',        casePlaceholder: 'cth. JKM/2026/KK/001234',   witnessLabel: 'Pegawai Penyelia / Ketua Unit' },
};

export default function SessionSetupPage() {
  const { profession: professionId } = useParams();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const profession = getProfession(professionId);
  const caseFields = professionCaseFields[professionId] || {};

  const [form, setForm] = useState(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem('session_setup') || '{}');
      if (saved.profession === professionId && saved.subject_name) {
        return {
          title: saved.title || '',
          interviewer: saved.interviewer || user?.user_metadata?.full_name || '',
          subject_name: saved.subject_name || '',
          subject_id: saved.subject_id || null,
          subject_role: saved.subject_role || '',
          case_number: saved.case_number || '',
          witness_officer: saved.witness_officer || '',
          context_notes: saved.context_notes || '',
        };
      }
    } catch { /* ignore parse errors */ }
    return {
      title: '',
      interviewer: user?.user_metadata?.full_name || '',
      subject_name: '',
      subject_id: null,
      subject_role: '',
      case_number: '',
      witness_officer: '',
      context_notes: '',
    };
  });

  const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleBack = () => {
    if (hasData(form)) {
      if (!window.confirm('Data yang anda masukkan akan hilang. Teruskan?')) return;
    }
    navigate(-1);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sessionStorage.setItem('session_setup', JSON.stringify({ ...form, profession: professionId }));
    localStorage.setItem('preferred_profession', professionId);
    navigate('/session/consent');
  };

  if (!profession) return <p className="p-6 text-red-500">Profesion tidak dijumpai.</p>;

  return (
    <div className="flex flex-col h-screen">
      <TopBar title={`Persediaan Sesi — ${profession.label}`} />
      <div className="flex-1 overflow-auto p-6 pb-20 md:pb-6">
        <div className="max-w-2xl mx-auto bg-white rounded-xl border p-6">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b">
            <span className="text-3xl">{profession.icon}</span>
            <div>
              <h2 className="font-semibold text-gray-900">{profession.label}</h2>
              <p className="text-sm text-gray-500">{profession.frameworks.join(' • ')}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <LabelWithTooltip label="Tajuk Sesi" required tooltip="Nama yang akan muncul dalam senarai sesi. Gunakan nama yang mudah dikenal pasti, cth: 'Sesi Penilaian Ahmad #3'." />
              <Input value={form.title} onChange={set('title')} placeholder="cth. Sesi Kaunseling #001" required />
            </div>

            <div>
              <LabelWithTooltip label={profession.interviewerLabel || 'Nama Pengendali Sesi'} required tooltip="Nama profesional yang menjalankan sesi ini. Nama ini akan terpapar dalam laporan rasmi." />
              <Input value={form.interviewer} onChange={set('interviewer')} placeholder="Nama anda" required />
            </div>

            {caseFields.caseLabel && (
              <div>
                <LabelWithTooltip label={caseFields.caseLabel} tooltip="Nombor rujukan rasmi kes ini dalam sistem organisasi anda. Digunakan untuk penyimpanan rekod dan rujukan silang." />
                <Input value={form.case_number} onChange={set('case_number')} placeholder={caseFields.casePlaceholder} />
              </div>
            )}

            <SubjectPicker
              label={profession.subjectLabel || 'Nama Subjek'}
              required
              value={form.subject_name}
              userId={user?.id}
              onChangeName={(name) => setForm(prev => ({ ...prev, subject_name: name }))}
              onChangeId={(id) => setForm(prev => ({ ...prev, subject_id: id }))}
            />

            <div>
              <LabelWithTooltip label="Peranan/Jawatan Subjek" tooltip="Peranan subjek dalam konteks sesi ini. Membantu AI menganalisis transkrip dengan lebih tepat." />
              <Input value={form.subject_role} onChange={set('subject_role')} placeholder="cth. Klien, Saksi, Tertuduh, Pesakit" />
            </div>

            {caseFields.witnessLabel && (
              <div>
                <LabelWithTooltip label={caseFields.witnessLabel} tooltip="Pegawai atau individu lain yang hadir sebagai saksi atau pemerhati dalam sesi ini." />
                <Input value={form.witness_officer} onChange={set('witness_officer')} placeholder="Nama pegawai saksi (jika ada)" />
              </div>
            )}

            <div>
              <LabelWithTooltip label="Nota Konteks" tooltip="Maklumat latar belakang yang membantu AI menghasilkan cadangan soalan dan laporan yang lebih tepat. Tidak akan dikongsi dengan subjek." />
              <Textarea value={form.context_notes} onChange={set('context_notes')} rows={3} placeholder="Latar belakang kes, tujuan sesi, maklumat relevan lain..." />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={handleBack}>Kembali</Button>
              <Button type="submit" className="flex-1">Teruskan ke Persetujuan →</Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
