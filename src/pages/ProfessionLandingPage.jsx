import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

const Logo = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="w-8 h-8 flex-shrink-0">
    <rect width="32" height="32" rx="8" fill="#2563eb"/>
    <polyline points="4,16 7,11 10,21 13,9 16,23 19,11 22,18 25,14 28,16"
      stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
  </svg>
);

const PROFESSION_META = {
  counselor: {
    title: 'VeriRec for Counselors — AI Real-Time SOAP Notes & Crisis Detection',
    desc:  'Record counseling sessions, detect suicide warning signs automatically, and generate clinical notes in one minute. Try free — first 2 sessions.',
  },
  police: {
    title: 'VeriRec for Police — Interview Recording with SHA-256 Chain of Custody',
    desc:  'Record witness and suspect interviews per PEACE Model. Generate official statement reports and prove record integrity in court.',
  },
  sprm: {
    title: 'VeriRec for SPRM/MACC — Anti-Corruption Investigation Documentation',
    desc:  'Investigation recording platform with chain of custody valid under UNCAC and Section 17 SPRM 2009. Contact us for a demo.',
  },
  doctor: {
    title: 'VeriRec for Doctors — Automatic SOAP Notes in 60 Seconds',
    desc:  'Record patient anamnesis, generate SOAP notes automatically, and detect psychiatric crisis signs in real-time. Try free — first 2 consultations.',
  },
  iso: {
    title: 'VeriRec for ISO Auditors — Automatic NCR and CAR per ISO 9001:2015',
    desc:  'Record audit sessions, generate Nonconformance and Corrective Action Reports automatically. Save 2–3 hours of documentation per audit session.',
  },
  hr: {
    title: 'VeriRec for HR — Transparent and Legally Valid Domestic Inquiry',
    desc:  'Record Domestic Inquiry sessions with SHA-256 chain of custody. Generate investigation reports per the Employment Act 1955. Try free.',
  },
  court: {
    title: 'VeriRec for Court — Real-Time Witness Testimony Analysis',
    desc:  'Detect inconsistencies in witness testimony, get AI cross-examination question suggestions, and document proceedings with SHA-256.',
  },
  peguam: {
    title: 'VeriRec for Lawyers — Consultation Documentation & AI Case Gap Analysis',
    desc:  'Record client consultations, analyze case fact gaps in real-time, and generate structured consultation reports. Legal Professional Privilege protected.',
  },
  jkm: {
    title: 'VeriRec for JKM Officers — Child Risk Assessment with AI',
    desc:  'Record welfare interviews, detect at-risk child warning signs in real-time, and generate strong case reports for court action.',
  },
};

const BASE_URL = 'https://www.verirec.app';

const PROFESSIONS = {
  counselor: {
    label: 'Counselor',
    hex: '#8b5cf6',
    badge: 'LKM · PDPA 2010 · Crisis Detection',
    headline: 'Focus on Clients.',
    headlineAccent: 'VeriRec Handles Documentation.',
    sub: 'Record counseling sessions, detect suicide warning signs automatically, and generate clinical notes in one minute.',
    ctaText: 'Try Free — 2 Counseling Sessions',
    enterpriseCta: false,
    painPoints: [
      { icon: '⏱', title: 'Manual notes take 2 hours a day', desc: 'Each session takes 30–60 minutes to write up. VeriRec generates an AI report in one minute.' },
      { icon: '🚨', title: 'Crisis warning signs can be missed', desc: 'In intensive sessions, keywords like "suicide" may go unnoticed. VeriRec detects them automatically.' },
      { icon: '📋', title: 'PDPA compliance is hard to maintain manually', desc: 'Inconsistent client consent records expose you to legal risk.' },
    ],
    features: [
      { title: 'Real-Time Crisis Detector', desc: 'Danger keywords detected during the session. A red alert banner appears instantly with Talian Kasih 15999 and MIASA numbers.' },
      { title: 'Automatic SOAP Notes', desc: 'Report contains SOAP format clinical notes (Subjective, Objective, Assessment, Plan) — ready for the client file.' },
      { title: 'Permanent PDPA Consent Records', desc: 'Digital consent form with timestamp for every client. Audit trail that cannot be deleted.' },
      { title: 'Follow-up Tracker', desc: 'AI-generated follow-up action list. Track client progress across sessions with an interactive checklist.' },
      { title: 'Quick Record', desc: 'Start recording immediately without filling a form — ideal for urgent situations. Client details can be completed after the session.' },
      { title: 'Audio Library', desc: 'All session recordings stored securely in a personal library. Replay, rename, and link audio to the client file for future reference.' },
    ],
  },
  police: {
    label: 'Police',
    hex: '#3b82f6',
    badge: 'PEACE Model · Cognitive Interview · SHA-256',
    headline: 'Interview Recording',
    headlineAccent: 'That Cannot Be Challenged in Court.',
    sub: 'Record witness and suspect interviews with SHA-256 chain of custody. Generate official statement reports automatically.',
    ctaText: 'Try Free — 2 Interview Sessions',
    enterpriseCta: false,
    painPoints: [
      { icon: '⚖️', title: 'Defence lawyers can challenge statement authenticity', desc: 'Manual statements have no integrity proof. VeriRec SHA-256 hash proves the report was not altered.' },
      { icon: '⏱', title: 'Manual transcription takes hours', desc: 'Every hour of recording = 4–6 hours of manual transcription. VeriRec does it in minutes.' },
      { icon: '📄', title: 'Statement format is inconsistent across officers', desc: 'Different formats between officers weaken credibility. VeriRec standardises statement output for all cases.' },
    ],
    features: [
      { title: 'SHA-256 Chain of Custody', desc: 'Every report is authenticated with a cryptographic hash. Prove the report was not altered — critical for court proceedings.' },
      { title: 'Official Statement Format', desc: 'Key facts, identified inconsistencies, and evidence notes generated in a structured format.' },
      { title: 'Case Number & Witness Officer', desc: 'Police report number and witness officer recorded in every session and displayed in the official report.' },
      { title: 'PEACE Model & Cognitive Interview', desc: 'AI question suggestions follow the internationally recognised PEACE Model and Cognitive Interview framework.' },
      { title: 'Quick Record', desc: 'Start an investigation session immediately without a form — useful in time-critical situations. Case details can be added after the session.' },
      { title: 'Audio Library', desc: 'All investigation recordings stored securely. Replay and link audio to the case number for complete case documentation.' },
    ],
  },
  sprm: {
    label: 'SPRM / MACC',
    hex: '#8b5cf6',
    badge: 'UNCAC · Section 17 SPRM 2009 · SHA-256',
    headline: 'Investigation Documentation',
    headlineAccent: 'That Cannot Be Disputed.',
    sub: 'Record corruption investigation interviews with chain of custody valid under UNCAC and Section 17 SPRM 2009.',
    ctaText: 'Contact Us for Demo',
    enterpriseCta: true,
    painPoints: [
      { icon: '⚖️', title: 'Conversation evidence can be challenged', desc: 'Without strong digital records, lawyers can dispute the accuracy and authenticity of statements in court.' },
      { icon: '⏱', title: 'Documentation process is slow', desc: 'Time spent on documentation reduces capacity to conduct more investigations.' },
      { icon: '📋', title: 'UNCAC compliance requires accurate records', desc: 'International standards require investigation documentation that is auditable and independently verifiable.' },
    ],
    features: [
      { title: 'SHA-256 Chain of Custody', desc: 'Cryptographic hash re-verifiable from stored data. Safe for legal proceedings.' },
      { title: 'Automatic Rights Notification', desc: 'Question framework per Section 17 SPRM 2009 procedure, including notification of rights to the investigated party.' },
      { title: 'Structured Statement Summary', desc: 'Key facts, inconsistencies, and evidence notes in a format suitable for the public prosecutor.' },
      { title: 'Case Number & Prosecuting Officer', desc: 'SPRM case number and prosecuting officer recorded in every session for easy cross-reference.' },
      { title: 'Quick Record', desc: 'Start an investigation immediately without filling a form. Suitable for time-critical situations — case details can be added after the session.' },
      { title: 'Audio Library', desc: 'Investigation recordings stored securely with SHA-256 chain of custody. Link audio to the case number for a complete audit trail.' },
    ],
  },
  doctor: {
    label: 'Doctor',
    hex: '#ef4444',
    badge: 'SOAP Note · Calgary-Cambridge · PDPA 2010',
    headline: 'Automatic SOAP Notes.',
    headlineAccent: 'More Time for Patients.',
    sub: 'Record patient anamnesis, generate SOAP notes in 60 seconds, and store records securely per clinical requirements.',
    ctaText: 'Try Free — 2 Consultations',
    enterpriseCta: false,
    painPoints: [
      { icon: '⏱', title: 'Notes consume 30–40% of a doctor\'s work time', desc: 'Writing notes after each patient reduces the number of patients you can see daily.' },
      { icon: '📝', title: 'Incomplete patient history', desc: 'In quick consultations, important details can be missed. Full transcription ensures nothing is overlooked.' },
      { icon: '⚠️', title: 'Psychiatric crisis signs can be missed', desc: 'Keywords like "suicide" require immediate attention that may be difficult during a busy consultation.' },
    ],
    features: [
      { title: 'Automatic SOAP Notes', desc: 'Subjective, Objective, Assessment, Plan generated from the patient conversation. No more writing notes from scratch.' },
      { title: 'Psychiatric Crisis Detector', desc: 'Psychiatric danger signs detected in real-time during the consultation with emergency resource references.' },
      { title: 'Malay Language Transcription', desc: 'Whisper AI supports Malay including medical terms and mixed-language contexts in clinical settings.' },
      { title: 'Secure Patient Records', desc: 'All records encrypted. Only you can access your patient records — full PDPA 2010 compliance.' },
      { title: 'Quick Record', desc: 'Start a consultation immediately without filling a form. Suitable for busy clinics — patient details can be updated after the consultation.' },
      { title: 'Audio Library', desc: 'Anamnesis recordings stored securely in the library. Link audio to the patient record for future clinical reference.' },
    ],
  },
  iso: {
    label: 'ISO Auditor',
    hex: '#f59e0b',
    badge: 'ISO 9001:2015 · ISO 19011:2018 · PDCA',
    headline: 'Automatic NCR and CAR.',
    headlineAccent: 'More Efficient Audits.',
    sub: 'Record audit sessions, generate Nonconformance Reports (NCR) and Corrective Action Reports (CAR) per ISO 9001:2015 automatically.',
    ctaText: 'Try Free — 2 Audit Sessions',
    enterpriseCta: false,
    painPoints: [
      { icon: '⏱', title: 'Writing manual NCR/CAR takes 2–3 hours', desc: 'After each audit session, auditors must write lengthy reports from handwritten notes. VeriRec generates them automatically.' },
      { icon: '📋', title: 'NCR format inconsistent across auditors', desc: 'Different formats damage report credibility and make it hard to compile in the final audit report.' },
      { icon: '🔍', title: 'Difficult to track corrective actions', desc: 'Corrective actions from past audits are easily forgotten without an organised tracking system.' },
    ],
    features: [
      { title: 'Automatic NCR/CAR', desc: 'Nonconformance, related ISO clause, root cause, and corrective action generated from the audit transcript.' },
      { title: 'Follow-up Tracker', desc: 'All corrective actions in an interactive list with target dates. Track until closure.' },
      { title: 'Audit Number & Auditee Representative', desc: 'Audit number and auditee representative recorded in every session for complete audit trail documentation.' },
      { title: 'SHA-256 Chain of Custody', desc: 'Audit records cannot be changed after generation — critical for certification body accreditation.' },
      { title: 'Quick Record', desc: 'Start an audit session immediately without filling a form. Auditee details can be added after the session — without disrupting audit flow.' },
      { title: 'Audio Library', desc: 'Audit session recordings stored securely. Link audio to the audit number for complete audit trail documentation.' },
    ],
  },
  hr: {
    label: 'HR Investigator',
    hex: '#6366f1',
    badge: 'EA 1955 · PDPA 2010 · SHA-256 Chain of Custody',
    headline: 'Domestic Inquiry',
    headlineAccent: 'Transparent and Legally Valid.',
    sub: 'Record Domestic Inquiry (DI) sessions with an unmanipulable chain of custody. Generate investigation reports per the Employment Act 1955.',
    ctaText: 'Try Free — 2 Investigation Sessions',
    enterpriseCta: false,
    painPoints: [
      { icon: '⚖️', title: 'Employees can challenge the investigation process', desc: 'An undocumented domestic inquiry exposes the company to the risk of an Industrial Court lawsuit.' },
      { icon: '📄', title: 'Investigation reports are not standardised', desc: 'Different formats across HR officers expose the company to procedural risk at the Industrial Tribunal.' },
      { icon: '📋', title: 'Employee PDPA records are hard to manage', desc: 'Employee information in investigations is subject to PDPA 2010. Manual documentation is insufficient for audit.' },
    ],
    features: [
      { title: 'Structured Domestic Inquiry Report', desc: 'Charges, investigation findings, recommendations, and proposed penalties generated per standard Domestic Inquiry (DI) format.' },
      { title: 'SHA-256 Chain of Custody', desc: 'Investigation records cannot be manipulated — perfect as evidence in IR/labour court proceedings.' },
      { title: 'Case Number & Witness Officer', desc: 'Disciplinary case number, HR officer, and examined witness recorded formally in every session.' },
      { title: 'Permanent PDPA Consent Records', desc: 'Employee consent records stored permanently. Full PDPA 2010 compliance for sensitive employee data.' },
      { title: 'Quick Record', desc: 'Start a domestic inquiry immediately without filling a form. Disciplinary case details can be added after the session ends.' },
      { title: 'Audio Library', desc: 'Inquiry recordings stored securely as additional evidence. Link audio to the disciplinary case number for robust documentation at the Industrial Tribunal.' },
    ],
  },
  jkm: {
    label: 'JKM Officer',
    hex: '#0d9488',
    badge: 'Child Act 2001 · Domestic Violence Act 1994 · JKM',
    headline: 'Protect. Document.',
    headlineAccent: 'Save Lives with Data.',
    sub: 'Record welfare interviews, detect at-risk child warning signs in real-time, and generate strong case reports for court action.',
    ctaText: 'Try Free — 2 Welfare Sessions',
    enterpriseCta: false,
    painPoints: [
      { icon: '🚨', title: 'Child warning signs can be missed', desc: 'In sensitive interviews, signs of abuse or neglect may go unnoticed. VeriRec AI detects them automatically during the session.' },
      { icon: '📝', title: 'Court case reports require precise documentation', desc: 'Incomplete welfare reports can cause cases to collapse in court. VeriRec generates structured, unmanipulable reports.' },
      { icon: '📂', title: 'High caseload reduces documentation quality', desc: 'JKM officers manage dozens of cases simultaneously. VeriRec automatic transcription saves time and improves record quality.' },
    ],
    features: [
      { title: 'Real-Time AI Red Flag Detection', desc: 'Risk keywords like "abuse", "afraid", "scars" detected during the session. Red alert banner appears instantly for immediate action.' },
      { title: 'Structured Risk Assessment Report', desc: 'Report contains risk indicators, protective factors, danger level (Low/Moderate/High), and intervention recommendations — court ready.' },
      { title: 'Trauma-Informed Interview Support', desc: 'AI suggests appropriate follow-up questions for child and at-risk family interviews per trauma-informed care guidelines.' },
      { title: 'SHA-256 Chain of Custody', desc: 'Every interview record authenticated with a cryptographic hash. Report cannot be manipulated — critical for welfare court proceedings.' },
      { title: 'Quick Record', desc: 'Start an interview immediately in a welfare emergency. No form needed — focus on individual safety first.' },
      { title: 'Audio Library', desc: 'Interview recordings stored securely. Link audio to the welfare case file for complete documentation that can be presented in court.' },
    ],
  },
  peguam: {
    label: 'Lawyer',
    hex: '#0891b2',
    badge: 'Legal Professional Privilege · Legal Profession Act 1976 · Bar Council',
    headline: 'Focus on Strategy.',
    headlineAccent: 'VeriRec Handles Case Documentation.',
    sub: 'Record client consultations and witness interviews, analyse case fact gaps in real-time, and generate structured case reports in one minute.',
    ctaText: 'Try Free — 2 Legal Sessions',
    enterpriseCta: false,
    painPoints: [
      { icon: '📝', title: 'Client consultation notes take hours', desc: 'Each consultation requires time-consuming manual transcription. VeriRec generates a structured report in one minute.' },
      { icon: '🔍', title: 'Case fact gaps are easily missed', desc: 'In long sessions, critical information can be overlooked. VeriRec AI detects gaps and suggests follow-up questions in real-time.' },
      { icon: '📂', title: 'Case file management is inefficient', desc: 'Consultation records in various formats make cross-referencing difficult. VeriRec standardises documentation for all cases.' },
    ],
    features: [
      { title: 'Real-Time AI Case Gap Analysis', desc: 'AI analyses the conversation during consultation — detects fact gaps, legal risks, and suggests precise follow-up questions automatically.' },
      { title: 'Structured Consultation Report', desc: 'Case facts, legal issues, risks, and recommended strategy generated automatically in professional legal file format.' },
      { title: 'Legal Professional Privilege Protected', desc: 'All records stored with full encryption. SHA-256 chain of custody proves the integrity of confidential consultation documents.' },
      { title: 'Permanent PDPA Consent Records', desc: 'Client consent for recording digitally recorded with timestamp. Permanent audit trail for PDPA 2010 compliance.' },
      { title: 'Quick Record', desc: 'Start a consultation immediately without lengthy setup. Client details can be added after the session — ideal for urgent consultations.' },
      { title: 'Audio Library', desc: 'Consultation recordings stored securely under Legal Professional Privilege. Link audio to the client file for case strategy reference.' },
    ],
  },
  court: {
    label: 'Lawyer & Court',
    hex: '#1e40af',
    badge: 'Evidence Act 1950 · CPC · Rules of Court 2012',
    headline: 'Witness Testimony Analysis',
    headlineAccent: 'Real-Time. During Proceedings.',
    sub: 'Detect inconsistencies in witness testimony, get AI cross-examination question suggestions, and document every proceeding with SHA-256 chain of custody.',
    ctaText: 'Try Free — 2 Court Sessions',
    enterpriseCta: false,
    painPoints: [
      { icon: '🔍', title: 'Testimony inconsistencies are hard to spot in real-time', desc: 'During fast cross-examination, contradictions with earlier testimony are easily missed. VeriRec detects them automatically.' },
      { icon: '📝', title: 'Manual court notes break concentration', desc: 'Writing notes during proceedings reduces focus on the witness. VeriRec automatic transcription frees the lawyer to focus.' },
      { icon: '⚖️', title: 'Proceedings documentation is inconsistent', desc: 'Handwritten notes differ between cases, affecting argument preparation. Structured digital records ease cross-referencing.' },
    ],
    features: [
      { title: 'Real-Time AI Testimony Analysis', desc: 'AI analyses witness testimony every few sentences — detects inconsistencies, testimony weaknesses, and suggests effective cross-examination questions.' },
      { title: 'Cross-Examination Question Suggestions', desc: 'Based on current testimony context, AI suggests follow-up questions you can use directly in proceedings.' },
      { title: 'SHA-256 Chain of Custody', desc: 'Every proceedings record authenticated with a cryptographic hash. Prove transcript was not altered — valid as documentation reference.' },
      { title: 'Case Number & Opposing Counsel', desc: 'Court case number, opposing counsel, and judge recorded in every session for complete and formal documentation.' },
      { title: 'Quick Record', desc: 'Start recording proceedings immediately without filling a form. Court details can be added after proceedings end.' },
      { title: 'Audio Library', desc: 'Proceedings recordings stored securely. Link audio to the court case number for complete documentation referenceable during appeal.' },
    ],
  },
};

const STEPS = [
  { num: '01', title: 'Fill Details or Record Directly', desc: 'Fill in subject name and case number (2 minutes), or use Quick Record — record directly without forms. Details can be completed after the session.' },
  { num: '02', title: 'Get Consent & Record', desc: 'Subject signs digital consent form. Start recording with one click. Audio is automatically saved to Library.' },
  { num: '03', title: 'Generate AI Report', desc: 'End session. Complete report with SHA-256 chain of custody generated in 60 seconds. Audio stored in library for future reference.' },
];

const TESTIMONIALS = {
  counselor: [
    { quote: 'Real-time suicide warning detection gives me confidence handling critical cases. The AI detected "don\'t want to live" — I could act faster than usual.', name: 'Pn. Suraya Ahmad', role: 'Registered Counselor (LKM)', org: 'Cahaya Counseling Centre, KL' },
    { quote: 'I used to spend 45 minutes writing notes after every session. Now SOAP notes are ready in one minute. I can take 3–4 additional clients per week.', name: 'En. Rizal Hamidon', role: 'Marriage Counselor', org: 'Islamic Welfare Centre Selangor' },
    { quote: 'Digital PDPA consent records give me peace of mind. No more risk of a case collapsing because a consent form was missing or incomplete.', name: 'Pn. Nurul Huda Ismail', role: 'School Counselor', org: 'SMK Subang Utama' },
  ],
  police: [
    { quote: 'SHA-256 hash on every investigation report — defence lawyers can no longer challenge recording integrity. It changed how we document cases.', name: 'DSP Ahmad Fauzi Halim', role: 'Head of Criminal Investigation', org: 'IPD Petaling Jaya' },
    { quote: 'Transcription of a 2-hour recording that used to take nearly a full workday is now ready in 10 minutes. We can focus entirely on the investigation.', name: 'Insp. Hairul Nizam', role: 'D9 Investigation Officer', org: 'Damansara Police Station' },
    { quote: 'Consistent statement format across all officers makes prosecution work easier. The Attorney General is very satisfied with our documentation quality.', name: 'ASP Zulaikha Ramli', role: 'Senior Investigation Officer', org: 'IPD Shah Alam' },
  ],
  sprm: [
    { quote: 'Our investigation documentation now fully meets UNCAC standards. The unquestionable chain of custody helped our cases succeed in court.', name: 'TPR Hafizuddin Malik', role: 'Senior Investigation Officer', org: 'SPRM Selangor' },
    { quote: 'The time we save on documentation is now used to conduct more investigations. Our unit capacity increased 40% in 6 months.', name: 'TPR Rohana Kadir', role: 'Investigation Unit Head', org: 'SPRM Federal Territory' },
    { quote: 'Audio recordings stored automatically in the library are extremely helpful for review. We can replay conversations to verify facts before submitting to the prosecutor.', name: 'TPR Azman Shafie', role: 'Investigation Officer', org: 'SPRM Johor' },
  ],
  doctor: [
    { quote: 'Automatic SOAP notes save me 20 minutes per patient. In one month, I was able to take 40+ additional patients without working overtime.', name: 'Dr. Farah Liyana Aziz', role: 'Medical Officer', org: 'Hospital Tengku Ampuan Rahimah, Klang' },
    { quote: 'Real-time psychiatric crisis detection is invaluable during busy consultations. The AI catches things I might miss in a 10-minute consultation.', name: 'Dr. Harith Syazwan', role: 'Psychiatry Specialist', org: 'KPJ Damansara Specialist Hospital' },
    { quote: 'I can give my full attention to the patient without worrying about notes. Patient feedback on consultation quality has improved noticeably.', name: 'Dr. Aishah Mohd Rodzi', role: 'Family Doctor', org: 'Taman Melawati Health Clinic' },
  ],
  iso: [
    { quote: 'NCR and CAR generated by VeriRec meet ISO 19011 standards. Our NCR closure rate went from 60% to 94% in the first 3 months of use.', name: 'En. Farouk Ibrahim', role: 'Principal Auditor MS ISO 9001', org: 'National Quality Consulting Firm' },
    { quote: 'What used to take 3 hours to write an audit report now takes 20 minutes. I can handle twice as many audits in the same time.', name: 'Pn. Kavitha Subramaniam', role: 'QMS Lead Auditor', org: 'SIRIM QAS International' },
    { quote: 'Tracking corrective actions in VeriRec makes auditee follow-ups much easier. Our certification body is very impressed with our documentation level.', name: 'En. Azrin Malik', role: 'Quality Manager', org: 'National Automotive Manufacturer' },
  ],
  hr: [
    { quote: 'The misconduct dismissal cases we handled using VeriRec were successfully upheld at the Industrial Court. Our documentation is unchallengeable.', name: 'Pn. Melissa Tan', role: 'CHRO', org: 'Bursa Malaysia Listed Company' },
    { quote: 'A Domestic Inquiry that used to take 2 weeks to fully document is now done in 2 days. The HR process is faster and more transparent for everyone.', name: 'En. Johari Kassim', role: 'HR Director', org: 'GLC Company Group' },
    { quote: 'PDPA consent records in every inquiry session guarantee the company\'s legal protection. Our company lawyer recommends VeriRec.', name: 'Pn. Rosnani Hj. Yusof', role: 'HR Manager', org: 'National Construction Company' },
  ],
  court: [
    { quote: 'Real-time witness testimony analysis helps me spot inconsistencies that might be missed during fast cross-examination. My case win rate has increased.', name: 'Pn. Lim Siew Ling', role: 'Trial Lawyer', org: 'Lim & Partners, KL' },
    { quote: 'Complete and unalterable proceedings documentation is invaluable in appeal cases. The Court of Appeal appreciates organised and transparent records.', name: 'En. Faizal Othman', role: 'Criminal Lawyer', org: 'Advocates & Solicitors' },
    { quote: 'AI cross-examination question suggestions help me prepare better before proceedings. My preparation time has been cut in half.', name: 'Pn. Aileen Kong', role: 'Advocates & Solicitors', org: 'Kuala Lumpur High Court' },
  ],
  peguam: [
    { quote: 'VeriRec-generated consultation reports save me 2–3 hours of work every day. I can take more clients without compromising service quality.', name: 'Tuan Hafizuddin Aziz', role: 'Partner', org: 'Hafiz & Associates, Petaling Jaya' },
    { quote: 'Real-time case gap analysis is invaluable in complex cases. The AI detects things that need further investigation before a case is filed.', name: 'Pn. Syazwani Latif', role: 'Civil Lawyer', org: 'Registered Advocates & Solicitors' },
    { quote: 'Secure consultation records give clients confidence that their information is protected. Legal Professional Privilege is fully maintained.', name: 'En. Bernard Yong', role: 'Property & Corporate Lawyer', org: 'Yong & Co, Kuala Lumpur' },
  ],
  jkm: [
    { quote: 'Real-time danger sign detection gives me confidence during sensitive interviews. The AI detected "afraid to go home" — we could act immediately to protect the child.', name: 'Pn. Norhaslinda Bakar', role: 'Senior Welfare Officer', org: 'JKM Selangor' },
    { quote: 'Complete risk assessment reports help our cases succeed in the welfare court. The judge greatly appreciates organised and unmanipulable documentation.', name: 'En. Rashdan Yusof', role: 'Welfare Officer', org: 'JKM Federal Territory KL' },
    { quote: 'Reduced documentation burden means I have more time for the families who need me. The quality of our welfare service has improved significantly.', name: 'Pn. Zaitun Mohd Noor', role: 'Head of Child Protection Unit', org: 'JKM Negeri Sembilan' },
  ],
};

const PLANS = [
  {
    key: 'free', label: 'Free', price: 0, sessions: 2, popular: false, trial: false,
    features: ['2 sessions / month', '1 user', 'AI real-time transcription', 'Basic PDF report'],
    notIncluded: ['Real-time AI analysis', 'PDF report', 'Priority support'],
  },
  {
    key: 'starter', label: 'Professional', price: 25, sessions: 10, popular: true, trial: false,
    features: ['10 sessions / month', 'Real-time AI analysis', 'PEACE Model guide', 'SOP PDF report', 'Speaker diarization', 'Top-up sessions when needed'],
    notIncluded: ['Unlimited users', 'SLA 99.9%'],
  },
  {
    key: 'pro', label: 'Pro', price: 249, sessions: 100, popular: true, trial: false,
    features: ['100 sessions / month', '10 users', 'All Professional features', 'AI analysis all professions', 'Priority support', 'API access'],
    notIncluded: ['200+ sessions/month'],
  },
  {
    key: 'biz', label: 'Business', price: 2499, sessions: 200, popular: false, trial: false,
    features: ['200 sessions/month', 'Unlimited users', 'All Pro features', 'Managed account', 'SLA 99.9%', 'Dedicated onboarding'],
    notIncluded: [],
  },
];

export default function ProfessionLandingPage({ professionSlug }) {
  const navigate = useNavigate();
  const [annual, setAnnual] = useState(false);
  const data = PROFESSIONS[professionSlug];

  if (!data) return null;

  const getMonthlyPrice = (plan) => annual ? Math.round(plan.price * 0.83) : plan.price;
  const getAnnualTotal  = (plan) => Math.round(plan.price * 10 * 0.83);

  const handleCta = () => {
    if (data.enterpriseCta) {
      window.location.href = 'mailto:hello@verirec.app?subject=Demo%20VeriRec%20' + encodeURIComponent(data.label);
      return;
    }
    localStorage.setItem('preferred_profession', professionSlug);
    navigate(`/auth?mode=register&profession=${professionSlug}`);
  };

  const handleLogin = () => navigate('/auth');

  const meta = PROFESSION_META[professionSlug] ?? {};
  const SLUG_TO_ROUTE = { counselor: 'kaunselor', police: 'polis', doctor: 'doktor', court: 'mahkamah' };
  const ogUrl = `${BASE_URL}/${SLUG_TO_ROUTE[professionSlug] ?? professionSlug}`;

  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>{meta.title}</title>
        <meta name="description" content={meta.desc} />
        <meta property="og:title" content={meta.title} />
        <meta property="og:description" content={meta.desc} />
        <meta property="og:url" content={ogUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content={`${BASE_URL}/pwa-512.svg`} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={meta.title} />
        <meta name="twitter:description" content={meta.desc} />
        <link rel="canonical" href={ogUrl} />
      </Helmet>

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur border-b px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button onClick={() => navigate('/home')} className="flex items-center gap-2">
            <Logo />
            <span className="font-bold text-gray-900 text-lg">VeriRec</span>
          </button>
          <div className="hidden sm:flex items-center gap-5 text-sm text-gray-600">
            <button onClick={() => navigate('/home')} className="hover:text-gray-900 transition-colors">← All Professions</button>
            <a href="#masalah" className="hover:text-gray-900 transition-colors">Problems</a>
            <a href="#ciri" className="hover:text-gray-900 transition-colors">Features</a>
            <a href="#harga" className="hover:text-gray-900 transition-colors">Pricing</a>
            <a href="/faq" className="hover:text-gray-900 transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleLogin} className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Sign In</button>
            <button
              onClick={handleCta}
              className="text-sm font-semibold text-white px-4 py-2 rounded-lg transition-colors"
              style={{ backgroundColor: data.hex }}
            >
              {data.enterpriseCta ? 'Contact Us' : 'Try Free'}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-24 px-6" style={{ background: `linear-gradient(to bottom, ${data.hex}08, white)` }}>
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full mb-6 border"
            style={{ backgroundColor: `${data.hex}15`, color: data.hex, borderColor: `${data.hex}30` }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: data.hex }} />
            {data.badge}
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 leading-tight mb-6">
            {data.headline}<br />
            <span style={{ color: data.hex }}>{data.headlineAccent}</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed">
            {data.sub}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleCta}
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 text-base font-semibold text-white rounded-xl transition-opacity hover:opacity-90 shadow-lg"
              style={{ backgroundColor: data.hex }}
            >
              {data.ctaText}
            </button>
            <button
              onClick={handleLogin}
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 text-base font-medium text-gray-700 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Sign In
            </button>
          </div>
          {!data.enterpriseCta && (
            <p className="text-xs text-gray-400 mt-4">No credit card · Cancel anytime</p>
          )}
        </div>

        {/* Trust row */}
        <div className="max-w-3xl mx-auto mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'PDPA 2010', sub: 'Consent audit trail' },
            { label: 'SHA-256', sub: 'Chain of custody' },
            { label: 'Whisper AI', sub: 'Accurate transcription' },
            { label: 'Made in Malaysia', sub: 'Data stored locally' },
          ].map(b => (
            <div key={b.label} className="bg-white rounded-xl border p-4 text-center shadow-sm">
              <p className="font-bold text-gray-900 text-sm">{b.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{b.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pain Points */}
      <section id="masalah" className="py-20 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Problems We Understand</h2>
            <p className="text-gray-500 mt-3">As a {data.label}, you face unique challenges that ordinary tools cannot solve.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {data.painPoints.map((p, i) => (
              <div key={i} className="bg-white rounded-2xl border p-6">
                <div className="text-3xl mb-3">{p.icon}</div>
                <h3 className="font-semibold text-gray-900 mb-2">{p.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="ciri" className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Built Specifically for {data.label}</h2>
            <p className="text-gray-500 mt-3">Not just an ordinary recording tool — a platform that understands your work.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {data.features.map((f, i) => (
              <div key={i} className="p-6 rounded-2xl border bg-white hover:shadow-md transition-shadow flex gap-4">
                <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-white text-sm font-bold"
                  style={{ backgroundColor: data.hex }}>
                  {i + 1}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{f.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      {TESTIMONIALS[professionSlug] && (
        <section className="py-20 px-6 bg-gray-50">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900">What They Say</h2>
              <p className="text-gray-500 mt-3">Practitioners who {data.label} have used VeriRec.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {TESTIMONIALS[professionSlug].map((t, i) => (
                <div key={i} className="bg-white rounded-2xl border p-6 flex flex-col">
                  <div className="flex gap-0.5 mb-4">
                    {[...Array(5)].map((_, s) => (
                      <svg key={s} className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed flex-1 mb-5">"{t.quote}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                      style={{ backgroundColor: data.hex }}>
                      {t.name.split(' ').pop()[0]}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{t.name}</p>
                      <p className="text-xs text-gray-500">{t.role} · {t.org}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* How it works */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Get Started in 3 Steps</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {STEPS.map((s, i) => (
              <div key={i} className="text-center">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white font-bold text-lg"
                  style={{ backgroundColor: data.hex }}>
                  {s.num}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="harga" className="py-20 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900">Simple Pricing, No Surprises</h2>
            <p className="text-gray-500 mt-3">Start free. Upgrade when you're ready.</p>

            {!data.enterpriseCta && (
              <div className="flex items-center justify-center gap-4 mt-6">
                <span className={`text-sm font-medium ${!annual ? 'text-gray-900' : 'text-gray-400'}`}>Monthly</span>
                <button
                  onClick={() => setAnnual(!annual)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${annual ? 'bg-blue-600' : 'bg-gray-300'}`}
                  style={annual ? { backgroundColor: data.hex } : {}}
                >
                  <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${annual ? 'translate-x-6' : ''}`} />
                </button>
                <span className={`text-sm font-medium ${annual ? 'text-gray-900' : 'text-gray-400'}`}>
                  Annual <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full ml-1">Save 17%</span>
                </span>
              </div>
            )}
          </div>

          {data.enterpriseCta ? (
            <div className="text-center bg-white rounded-2xl border p-10 max-w-lg mx-auto">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Special Pricing for Institutions</h3>
              <p className="text-gray-500 mb-6">We provide special packages for government agencies including onboarding, training, and SLA support.</p>
              <button
                onClick={() => { window.location.href = 'mailto:hello@verirec.app?subject=Pertanyaan%20Pricing%20Institusi'; }}
                className="px-8 py-3 font-semibold text-white rounded-xl hover:opacity-90 transition-opacity"
                style={{ backgroundColor: data.hex }}
              >
                Contact Us for Demo
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {PLANS.map(plan => {
                const monthlyPrice = getMonthlyPrice(plan);
                return (
                  <div
                    key={plan.key}
                    className={`relative rounded-2xl border-2 p-6 flex flex-col bg-white ${plan.popular ? 'shadow-xl' : 'border-gray-200'}`}
                    style={plan.popular ? { borderColor: data.hex } : {}}
                  >
                    {plan.popular && (
                      <div
                        className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-white text-xs font-bold px-4 py-1.5 rounded-full whitespace-nowrap shadow"
                        style={{ backgroundColor: data.hex }}
                      >
                        Most Popular
                      </div>
                    )}

                    <h3 className="text-lg font-bold text-gray-900">{plan.label}</h3>
                    <p className="text-xs text-gray-500 mt-0.5 mb-4">{plan.sessions} sessions / month</p>

                    <div className="mb-5">
                      {plan.price === 0 ? (
                        <p className="text-3xl font-bold text-gray-900">Free</p>
                      ) : (
                        <>
                          <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-bold text-gray-900">${monthlyPrice}</span>
                            <span className="text-gray-500 text-sm">/month</span>
                          </div>
                          {annual && (
                            <p className="text-xs text-gray-400 mt-0.5">Billed ${getAnnualTotal(plan)}/year</p>
                          )}
                        </>
                      )}
                    </div>

                    <ul className="space-y-2 mb-6 flex-1">
                      {plan.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                          <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          {f}
                        </li>
                      ))}
                      {plan.notIncluded.map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-400">
                          <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          {f}
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={() => plan.key === 'biz'
                        ? (window.location.href = 'mailto:hello@verirec.app?subject=Pertanyaan%20Pelan%20Perniagaan%20VeriRec')
                        : handleCta()
                      }
                      disabled={plan.key === 'free' && false}
                      className="w-full py-2.5 rounded-xl font-semibold text-sm transition-opacity hover:opacity-90"
                      style={plan.popular
                        ? { backgroundColor: data.hex, color: 'white' }
                        : { backgroundColor: 'transparent', color: data.hex, border: `1.5px solid ${data.hex}` }
                      }
                    >
                      {plan.key === 'free' ? 'Try Free' : plan.key === 'biz' ? 'Contact Us' : 'Subscribe Now'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-20 px-6" style={{ backgroundColor: data.hex }}>
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            {data.enterpriseCta ? `Free Demo for ${data.label}` : `Get Started Today — Free`}
          </h2>
          <p className="mb-8" style={{ color: 'rgba(255,255,255,0.8)' }}>
            {data.enterpriseCta
              ? 'Contact us for a live demo and discussion of your institution needs.'
              : '2 free sessions. No credit card required. Cancel anytime.'}
          </p>
          <button
            onClick={handleCta}
            className="inline-flex items-center justify-center gap-2 bg-white font-semibold rounded-xl px-10 py-3.5 text-base transition-colors hover:opacity-90"
            style={{ color: data.hex }}
          >
            {data.ctaText}
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 px-6 py-10">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <button onClick={() => navigate('/home')} className="flex items-center gap-2">
            <Logo />
            <span className="font-bold text-white">VeriRec</span>
            <span className="text-xs text-gray-500 ml-2">Professional Session Recording Platform</span>
          </button>
          <div className="flex items-center gap-6 text-sm">
            <button onClick={() => navigate('/home')} className="hover:text-white transition-colors">Home</button>
            <button onClick={() => navigate('/faq')} className="hover:text-white transition-colors">FAQ</button>
            <button onClick={() => navigate('/pricing')} className="hover:text-white transition-colors">Pricing</button>
            <button onClick={() => navigate('/terms')} className="hover:text-white transition-colors">Terms</button>
            <button onClick={() => navigate('/privacy')} className="hover:text-white transition-colors">Privacy</button>
            <a href="mailto:hello@verirec.app" className="hover:text-white transition-colors">Contact Us</a>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-8 pt-6 border-t border-gray-800 text-center text-xs text-gray-600">
          © {new Date().getFullYear()} VeriRec. Built in Malaysia. PDPA 2010 Compliant.
        </div>
      </footer>
    </div>
  );
}
