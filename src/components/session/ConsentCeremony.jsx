import { useState } from 'react';
import { SignaturePad } from './SignaturePad.jsx';
import { sealConsent } from '../../api/consent.js';
import {
  CONSENT_SECTIONS, CONSENT_UI, CRISIS_RESOURCES, CONSENT_VERSION,
} from '../../data/consentDocument.js';
import toast from 'react-hot-toast';

const fill = (str, vars) => str.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);

/**
 * In-person, counselor-read, client-signed informed consent.
 * The counselor reads each section aloud; the client ticks the required
 * clauses, optionally names a guardian, and draws their signature.
 * The signed record is sealed server-side (SHA-256) via sealConsent().
 */
export default function ConsentCeremony({ subjectId, clientName, counselorName, onComplete, onCancel }) {
  const [lang, setLang] = useState('ms');
  const [acks, setAcks] = useState({});
  const [fullName, setFullName] = useState('');
  const [icNumber, setIcNumber] = useState('');
  const [isGuardian, setIsGuardian] = useState(false);
  const [guardianName, setGuardianName] = useState('');
  const [guardianRel, setGuardianRel] = useState('');
  const [signature, setSignature] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const vars = { counselor: counselorName || 'your counselor', client: clientName || '' };
  const t = (obj) => obj?.[lang] ?? obj?.en ?? '';

  const requiredAckKeys = CONSENT_SECTIONS.filter(s => s.requiresAck).map(s => s.id);
  const allAcked = requiredAckKeys.every(k => acks[k]);
  const guardianOk = !isGuardian || (guardianName.trim() && guardianRel.trim());
  const canSubmit = allAcked && fullName.trim() && signature && guardianOk && !submitting;

  const toggleAck = (id) => setAcks(prev => ({ ...prev, [id]: !prev[id] }));

  const handleSubmit = async () => {
    if (!canSubmit) {
      if (!allAcked) toast.error(lang === 'ms' ? 'Sila tanda semua klausa yang diperlukan.' : 'Please acknowledge all required clauses.');
      else if (!fullName.trim()) toast.error(lang === 'ms' ? 'Sila isi nama penuh.' : 'Please enter the full name.');
      else if (!guardianOk) toast.error(lang === 'ms' ? 'Sila lengkapkan maklumat penjaga.' : 'Please complete the guardian details.');
      else if (!signature) toast.error(lang === 'ms' ? 'Sila tandatangan.' : 'Please sign.');
      return;
    }
    setSubmitting(true);
    try {
      const consent = await sealConsent({
        subject_id: subjectId,
        language: lang,
        full_name: fullName.trim(),
        ic_number: icNumber.trim() || null,
        is_guardian: isGuardian,
        guardian_name: isGuardian ? guardianName.trim() : null,
        guardian_relationship: isGuardian ? guardianRel.trim() : null,
        clauses: acks,
        signature,
        signed_at: new Date().toISOString(),
      });
      toast.success(lang === 'ms' ? 'Kebenaran direkod & dimeterai.' : 'Consent recorded & sealed.');
      onComplete?.(consent);
    } catch (err) {
      toast.error(err.message || 'Failed to record consent.');
    } finally {
      setSubmitting(false);
    }
  };

  const input = 'w-full rounded-xl px-4 py-2.5 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm';

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white p-6 mb-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-violet-200">Informed Consent</p>
            <h2 className="text-xl font-bold mt-1">{clientName}</h2>
          </div>
          <div className="flex rounded-xl bg-white/15 p-1 ring-1 ring-white/20 text-sm font-semibold">
            {['ms', 'en'].map(l => (
              <button key={l} type="button" onClick={() => setLang(l)}
                className={`px-3 py-1 rounded-lg transition-colors ${lang === l ? 'bg-white text-violet-700' : 'text-white/90'}`}>
                {l === 'ms' ? 'BM' : 'EN'}
              </button>
            ))}
          </div>
        </div>
        <p className="text-sm text-violet-100 mt-3">{t(CONSENT_UI.readAloudHint)}</p>
      </div>

      {/* Sections */}
      <div className="space-y-3">
        {CONSENT_SECTIONS.map(section => (
          <div key={section.id} className="rounded-2xl ring-1 ring-gray-100 bg-white shadow-sm p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center text-xl rounded-xl bg-gradient-to-br from-violet-50 to-fuchsia-50 ring-1 ring-violet-100">
                {section.icon}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900">{t(section.title)}</h3>
                <p className="text-sm text-gray-600 leading-relaxed mt-1 whitespace-pre-line">{fill(t(section.body), vars)}</p>

                {section.id === 'crisis' && (
                  <ul className="mt-3 space-y-1.5">
                    {CRISIS_RESOURCES.map(r => (
                      <li key={r.label} className="flex items-center justify-between text-sm rounded-lg bg-red-50 ring-1 ring-red-100 px-3 py-2">
                        <span className="font-semibold text-red-700">{r.label}</span>
                        <span className="text-red-600">{r.value}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {section.requiresAck && (
                  <label className="mt-3 flex items-center gap-2.5 cursor-pointer select-none">
                    <input type="checkbox" checked={!!acks[section.id]} onChange={() => toggleAck(section.id)}
                      className="h-5 w-5 rounded accent-violet-600 flex-shrink-0" />
                    <span className={`text-sm font-medium ${acks[section.id] ? 'text-violet-700' : 'text-gray-500'}`}>
                      {t(CONSENT_UI.ackLabel)}
                    </span>
                  </label>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Signer details */}
      <div className="rounded-2xl ring-1 ring-gray-100 bg-white shadow-sm p-5 mt-3 space-y-4">
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input type="checkbox" checked={isGuardian} onChange={e => setIsGuardian(e.target.checked)}
            className="h-5 w-5 rounded accent-violet-600" />
          <span className="text-sm font-medium text-gray-700">{t(CONSENT_UI.minorToggle)}</span>
        </label>

        {isGuardian && (
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">{t(CONSENT_UI.guardianName)}</label>
              <input className={input} value={guardianName} onChange={e => setGuardianName(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">{t(CONSENT_UI.guardianRel)}</label>
              <input className={input} value={guardianRel} onChange={e => setGuardianRel(e.target.value)} />
            </div>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">
              {isGuardian ? `${t(CONSENT_UI.fullName)} (${lang === 'ms' ? 'penandatangan' : 'signer'})` : t(CONSENT_UI.fullName)}
            </label>
            <input className={input} value={fullName} onChange={e => setFullName(e.target.value)} placeholder={clientName} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">{t(CONSENT_UI.icNumber)}</label>
            <input className={input} value={icNumber} onChange={e => setIcNumber(e.target.value)} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-900 mb-2">{t(CONSENT_UI.signTitle)}</label>
          {signature ? (
            <div className="rounded-xl ring-1 ring-violet-200 bg-violet-50/40 p-3 flex items-center justify-between gap-3">
              <img src={signature} alt="signature" className="h-16 bg-white rounded-lg ring-1 ring-gray-100" />
              <button type="button" onClick={() => setSignature(null)}
                className="text-sm text-gray-500 hover:text-gray-700 underline-offset-2 hover:underline">
                {lang === 'ms' ? 'Tandatangan semula' : 'Re-sign'}
              </button>
            </div>
          ) : (
            <SignaturePad onSave={setSignature} />
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-3 mt-5">
        {onCancel && (
          <button type="button" onClick={onCancel} disabled={submitting}
            className="text-sm font-medium text-gray-500 hover:text-gray-700 px-4 py-2.5">
            {lang === 'ms' ? 'Batal' : 'Cancel'}
          </button>
        )}
        <button type="button" onClick={handleSubmit} disabled={!canSubmit}
          className="flex-1 sm:flex-none sm:ml-auto bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold px-8 py-3 rounded-xl shadow-lg shadow-violet-200 hover:-translate-y-0.5 hover:shadow-xl transition-all disabled:opacity-50 disabled:hover:translate-y-0">
          {submitting
            ? (lang === 'ms' ? 'Merekod...' : 'Recording...')
            : (lang === 'ms' ? 'Rekod & Meterai Kebenaran' : 'Record & Seal Consent')}
        </button>
      </div>
      <p className="text-center text-xs text-gray-400 mt-3">
        v{CONSENT_VERSION} · {lang === 'ms'
          ? 'Tandatangan dimeterai dengan SHA-256 & cap masa.'
          : 'Signature sealed with SHA-256 & timestamp.'}
      </p>
    </div>
  );
}
