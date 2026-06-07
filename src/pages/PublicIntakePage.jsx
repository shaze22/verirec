import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';

const supabaseAnon = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);

const STEPS = [
  { id: 'personal', title: 'Personal Information', subtitle: 'Step 1 of 3' },
  { id: 'concern',  title: 'Presenting Concern',   subtitle: 'Step 2 of 3' },
  { id: 'confirm',  title: 'Consent & Submit',      subtitle: 'Step 3 of 3' },
];

const EMPTY = {
  // Personal
  full_name: '', ic_passport: '', phone: '', email: '',
  date_of_birth: '', gender: '', marital_status: '', race: '',
  religion: '', occupation: '', address: '',
  emergency_name: '', emergency_phone: '', emergency_relationship: '',
  // Concern
  presenting_concern: '', concern_duration: '', counseling_goals: '',
  previous_counseling: '', previous_counseling_details: '',
  current_medications: '', current_medications_details: '',
  medical_conditions: '',
  // Risk
  self_harm_thoughts: '', suicidal_thoughts: '', substance_use: '',
  // Consent
  consent: false,
};

export default function PublicIntakePage() {
  const { token } = useParams();
  const [form, setForm] = useState(null);
  const [status, setStatus] = useState('loading'); // loading|ready|expired|invalid|submitting|done|error
  const [step, setStep]   = useState(0);
  const [answers, setAnswers] = useState({ ...EMPTY });

  useEffect(() => {
    if (!token) { setStatus('invalid'); return; }
    supabaseAnon
      .from('client_intake_forms')
      .select('id, subject_name, status, expires_at')
      .eq('token', token)
      .single()
      .then(({ data, error }) => {
        if (error || !data) { setStatus('invalid'); return; }
        if (data.status === 'completed') { setStatus('done'); return; }
        if (new Date(data.expires_at) < new Date()) { setStatus('expired'); return; }
        setForm(data);
        setStatus('ready');
      });
  }, [token]);

  const set = (k, v) => setAnswers(prev => ({ ...prev, [k]: v }));

  const canProceed = () => {
    if (step === 0) return answers.full_name.trim() && answers.phone.trim();
    if (step === 1) return answers.presenting_concern.trim().length >= 10;
    if (step === 2) return answers.consent;
    return true;
  };

  const handleSubmit = async () => {
    setStatus('submitting');
    try {
      const { error } = await supabaseAnon
        .from('client_intake_forms')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          form_answers: answers,
        })
        .eq('token', token);
      if (error) throw error;
      setStatus('done');
    } catch {
      setStatus('error');
    }
  };

  if (status === 'loading') return (
    <Screen><div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" /></Screen>
  );
  if (status === 'invalid') return (
    <Screen><StatusCard emoji="🔍" title="Form Not Found" desc="This link is invalid or has expired. Please contact your counselor." /></Screen>
  );
  if (status === 'expired') return (
    <Screen><StatusCard emoji="⏰" title="Link Expired" desc="This intake form link has expired. Please ask your counselor to send a new one." /></Screen>
  );
  if (status === 'error') return (
    <Screen>
      <StatusCard emoji="⚠️" title="Submission Failed" desc="Could not submit your form. Please try again.">
        <button onClick={() => setStatus('ready')} className="mt-4 px-5 py-2 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700">
          Try Again
        </button>
      </StatusCard>
    </Screen>
  );
  if (status === 'done') return (
    <Screen>
      <div className="text-center max-w-sm space-y-3">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900">Form Submitted</h2>
        <p className="text-sm text-gray-500">Thank you. Your counselor will review your information before your session. You may close this page.</p>
        <p className="text-xs text-gray-300 pt-2">Powered by kaunselor.app</p>
      </div>
    </Screen>
  );
  if (status === 'submitting') return (
    <Screen>
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-violet-700 font-medium text-sm">Submitting your form...</p>
      </div>
    </Screen>
  );

  const pct = Math.round(((step + 1) / STEPS.length) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 to-white">
      {/* Header */}
      <div className="bg-white border-b px-4 py-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400">{STEPS[step].subtitle}</p>
            <h1 className="text-sm font-bold text-gray-900">{STEPS[step].title}</h1>
            <p className="text-xs text-gray-500 mt-0.5">For: <strong className="text-gray-700">{form?.subject_name}</strong></p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xs font-bold text-violet-600">{pct}%</p>
          </div>
        </div>
        <div className="max-w-lg mx-auto mt-2.5 h-1 bg-gray-100 rounded-full">
          <div className="h-1 bg-violet-500 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8 space-y-5">

        {/* ── STEP 1: Personal ── */}
        {step === 0 && (
          <div className="space-y-4">
            <div className="bg-violet-50 border border-violet-100 rounded-xl p-4">
              <p className="text-sm text-violet-800 font-medium mb-1">Counseling Intake Form</p>
              <p className="text-xs text-violet-600">Please fill in your personal details accurately. All information is kept strictly confidential.</p>
            </div>

            <Section title="Personal Details">
              <Field label="Full Name *" required>
                <Input value={answers.full_name} onChange={v => set('full_name', v)} placeholder="As per IC / Passport" />
              </Field>
              <Field label="IC No. / Passport No.">
                <Input value={answers.ic_passport} onChange={v => set('ic_passport', v)} placeholder="e.g. 900101-01-1234" />
              </Field>
              <TwoCol>
                <Field label="Phone *" required>
                  <Input value={answers.phone} onChange={v => set('phone', v)} placeholder="01X-XXXXXXXX" type="tel" />
                </Field>
                <Field label="Email">
                  <Input value={answers.email} onChange={v => set('email', v)} placeholder="email@example.com" type="email" />
                </Field>
              </TwoCol>
              <TwoCol>
                <Field label="Date of Birth">
                  <Input value={answers.date_of_birth} onChange={v => set('date_of_birth', v)} type="date" />
                </Field>
                <Field label="Gender">
                  <Select value={answers.gender} onChange={v => set('gender', v)} options={['','Male','Female','Prefer not to say']} />
                </Field>
              </TwoCol>
              <TwoCol>
                <Field label="Marital Status">
                  <Select value={answers.marital_status} onChange={v => set('marital_status', v)} options={['','Single','Married','Divorced','Widowed']} />
                </Field>
                <Field label="Race / Ethnicity">
                  <Input value={answers.race} onChange={v => set('race', v)} placeholder="e.g. Malay, Chinese..." />
                </Field>
              </TwoCol>
              <TwoCol>
                <Field label="Religion">
                  <Input value={answers.religion} onChange={v => set('religion', v)} placeholder="e.g. Islam, Christian..." />
                </Field>
                <Field label="Occupation / Programme">
                  <Input value={answers.occupation} onChange={v => set('occupation', v)} placeholder="e.g. Student, Engineer..." />
                </Field>
              </TwoCol>
              <Field label="Home Address">
                <Input value={answers.address} onChange={v => set('address', v)} placeholder="Street, City, State" />
              </Field>
            </Section>

            <Section title="Emergency Contact">
              <TwoCol>
                <Field label="Contact Name">
                  <Input value={answers.emergency_name} onChange={v => set('emergency_name', v)} placeholder="Full name" />
                </Field>
                <Field label="Relationship">
                  <Input value={answers.emergency_relationship} onChange={v => set('emergency_relationship', v)} placeholder="e.g. Parent, Spouse" />
                </Field>
              </TwoCol>
              <Field label="Contact Phone">
                <Input value={answers.emergency_phone} onChange={v => set('emergency_phone', v)} placeholder="01X-XXXXXXXX" type="tel" />
              </Field>
            </Section>
          </div>
        )}

        {/* ── STEP 2: Concern ── */}
        {step === 1 && (
          <div className="space-y-4">
            <Section title="Reason for Seeking Counseling">
              <Field label="What brings you to counseling? *" required>
                <textarea
                  value={answers.presenting_concern}
                  onChange={e => set('presenting_concern', e.target.value)}
                  rows={4}
                  placeholder="Please describe what is bothering you or what you would like help with..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                />
                {answers.presenting_concern.length < 10 && answers.presenting_concern.length > 0 && (
                  <p className="text-xs text-amber-600 mt-1">Please provide more detail (min 10 characters)</p>
                )}
              </Field>
              <Field label="How long have you been experiencing this concern?">
                <Select value={answers.concern_duration} onChange={v => set('concern_duration', v)} options={['','Less than 1 week','1–4 weeks','1–3 months','3–6 months','6–12 months','More than 1 year']} />
              </Field>
              <Field label="What do you hope to achieve from counseling?">
                <textarea
                  value={answers.counseling_goals}
                  onChange={e => set('counseling_goals', e.target.value)}
                  rows={3}
                  placeholder="e.g. Learn coping strategies, improve relationships, manage stress..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                />
              </Field>
            </Section>

            <Section title="Previous Counseling / Treatment">
              <Field label="Have you received counseling or psychological treatment before?">
                <RadioGroup
                  value={answers.previous_counseling}
                  onChange={v => set('previous_counseling', v)}
                  options={[['yes','Yes'],['no','No']]}
                />
              </Field>
              {answers.previous_counseling === 'yes' && (
                <Field label="If yes, please describe briefly">
                  <textarea
                    value={answers.previous_counseling_details}
                    onChange={e => set('previous_counseling_details', e.target.value)}
                    rows={2}
                    placeholder="e.g. Saw a school counselor in 2022 for anxiety..."
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                  />
                </Field>
              )}
            </Section>

            <Section title="Health Information">
              <Field label="Are you currently taking any medications?">
                <RadioGroup
                  value={answers.current_medications}
                  onChange={v => set('current_medications', v)}
                  options={[['yes','Yes'],['no','No']]}
                />
              </Field>
              {answers.current_medications === 'yes' && (
                <Field label="If yes, please list medications">
                  <Input value={answers.current_medications_details} onChange={v => set('current_medications_details', v)} placeholder="e.g. Sertraline 50mg, Lorazepam 1mg..." />
                </Field>
              )}
              <Field label="Any significant medical conditions? (optional)">
                <Input value={answers.medical_conditions} onChange={v => set('medical_conditions', v)} placeholder="e.g. Diabetes, hypertension, asthma..." />
              </Field>
            </Section>
          </div>
        )}

        {/* ── STEP 3: Risk check + Consent ── */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-amber-900 mb-1">Important Questions</p>
              <p className="text-xs text-amber-700">Your answers help your counselor understand your current situation and provide appropriate support. All answers are confidential.</p>
            </div>

            <Section title="Current Wellbeing">
              <Field label="In the past 2 weeks, have you had any thoughts of harming yourself?">
                <RadioGroup
                  value={answers.self_harm_thoughts}
                  onChange={v => set('self_harm_thoughts', v)}
                  options={[['no','No'],['yes_passive','Yes, fleeting thoughts (passive)'],['yes_active','Yes, with a plan (active)']]}
                />
              </Field>
              <Field label="In the past 2 weeks, have you had any thoughts of ending your life?">
                <RadioGroup
                  value={answers.suicidal_thoughts}
                  onChange={v => set('suicidal_thoughts', v)}
                  options={[['no','No'],['yes_passive','Yes, fleeting thoughts (passive)'],['yes_active','Yes, with a plan (active)']]}
                />
              </Field>
              <Field label="Are you currently using alcohol or substances regularly?">
                <RadioGroup
                  value={answers.substance_use}
                  onChange={v => set('substance_use', v)}
                  options={[['no','No'],['occasionally','Occasionally'],['regularly','Regularly']]}
                />
              </Field>
            </Section>

            {(answers.self_harm_thoughts === 'yes_active' || answers.suicidal_thoughts === 'yes_active') && (
              <div className="bg-red-50 border border-red-300 rounded-xl p-4">
                <p className="text-sm font-semibold text-red-900 mb-1">Please reach out immediately</p>
                <p className="text-sm text-red-800">If you are in immediate danger, please call <strong>Talian Kasih 15999</strong> or go to your nearest hospital emergency.</p>
              </div>
            )}

            <Section title="Consent & Declaration">
              <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-600 leading-relaxed space-y-2">
                <p><strong>Confidentiality:</strong> All information shared is strictly confidential under the Counselors Act 1998 and PDPA 2010, except where required by law (e.g. risk of harm to self or others).</p>
                <p><strong>Voluntary:</strong> Participation in counseling is voluntary. You may stop at any time.</p>
                <p><strong>Records:</strong> Session records are kept securely and may be reviewed only by your counselor and relevant clinical supervisors.</p>
              </div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={answers.consent}
                  onChange={e => set('consent', e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-violet-600 flex-shrink-0"
                />
                <span className="text-sm text-gray-700">I confirm that the information provided is accurate and I consent to counseling services as described above.</span>
              </label>
            </Section>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center gap-3 pt-2">
          {step > 0 && (
            <button
              onClick={() => setStep(s => s - 1)}
              className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              ← Back
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!canProceed()}
              className="flex-1 py-3 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Continue →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!canProceed()}
              className="flex-1 py-3 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Submit Form ✓
            </button>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 pb-4">
          kaunselor.app — Your information is strictly confidential.
        </p>
      </div>
    </div>
  );
}

// ── Small Components ──

function Screen({ children }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-violet-50 p-6">
      {children}
    </div>
  );
}

function StatusCard({ emoji, title, desc, children }) {
  return (
    <div className="text-center max-w-sm">
      <div className="text-5xl mb-4">{emoji}</div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">{title}</h2>
      <p className="text-gray-500 text-sm">{desc}</p>
      {children}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="bg-white rounded-2xl border shadow-sm p-5 space-y-3">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{title}</p>
      {children}
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-violet-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function TwoCol({ children }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>;
}

function Input({ value, onChange, placeholder, type = 'text' }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
    />
  );
}

function Select({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
    >
      {options.map(o => <option key={o} value={o}>{o || '— Select —'}</option>)}
    </select>
  );
}

function RadioGroup({ value, onChange, options }) {
  return (
    <div className="space-y-1.5">
      {options.map(([val, label]) => (
        <label key={val} className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="radio"
            name={Math.random().toString(36).slice(2)}
            value={val}
            checked={value === val}
            onChange={() => onChange(val)}
            className="w-4 h-4 accent-violet-600"
          />
          <span className={`text-sm ${value === val ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>{label}</span>
        </label>
      ))}
    </div>
  );
}
