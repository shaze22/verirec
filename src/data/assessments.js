// Clinical & career assessments — all public domain / free for clinical use
// PHQ-9, GAD-7, DASS-21: free for clinical use
// RIASEC: Holland (1973) public domain
// TIPI: Gosling et al. (2003) public domain

const SCALE_04 = [
  { value: 0, label: 'Not at all' },
  { value: 1, label: 'Several days' },
  { value: 2, label: 'More than half the days' },
  { value: 3, label: 'Nearly every day' },
];

const SCALE_DASS = [
  { value: 0, label: 'Did not apply to me at all' },
  { value: 1, label: 'Applied to me to some degree / some of the time' },
  { value: 2, label: 'Applied to me considerably / good part of the time' },
  { value: 3, label: 'Applied to me very much / most of the time' },
];

const SCALE_LIKERT5 = [
  { value: 1, label: 'Strongly dislike' },
  { value: 2, label: 'Dislike' },
  { value: 3, label: 'Neutral' },
  { value: 4, label: 'Like' },
  { value: 5, label: 'Strongly like' },
];

const SCALE_TIPI = [
  { value: 1, label: 'Disagree strongly' },
  { value: 2, label: 'Disagree moderately' },
  { value: 3, label: 'Disagree a little' },
  { value: 4, label: 'Neither agree nor disagree' },
  { value: 5, label: 'Agree a little' },
  { value: 6, label: 'Agree moderately' },
  { value: 7, label: 'Agree strongly' },
];

export const ASSESSMENTS = {
  phq9: {
    id: 'phq9',
    name: 'PHQ-9',
    fullName: 'Patient Health Questionnaire-9',
    description: 'Depression severity screening',
    category: 'clinical',
    minutes: 5,
    badge: 'Depression',
    badgeColor: 'blue',
    instructions: 'Over the last 2 weeks, how often have you been bothered by any of the following problems?',
    scale: SCALE_04,
    questions: [
      'Little interest or pleasure in doing things',
      'Feeling down, depressed, or hopeless',
      'Trouble falling or staying asleep, or sleeping too much',
      'Feeling tired or having little energy',
      'Poor appetite or overeating',
      'Feeling bad about yourself — or that you are a failure or have let yourself or your family down',
      'Trouble concentrating on things, such as reading the newspaper or watching television',
      'Moving or speaking so slowly that other people could have noticed, or the opposite — being so fidgety or restless that you have been moving around a lot more than usual',
      'Thoughts that you would be better off dead, or of hurting yourself in some way',
    ],
    score(answers) {
      return { total: answers.reduce((s, v) => s + v, 0) };
    },
    interpret(scores) {
      const s = scores.total;
      if (s <= 4)  return { level: 'Minimal',             color: 'green',  note: 'Minimal or no depression symptoms.' };
      if (s <= 9)  return { level: 'Mild',                color: 'yellow', note: 'Mild depression. Monitor and follow up.' };
      if (s <= 14) return { level: 'Moderate',            color: 'orange', note: 'Moderate depression. Consider counseling and further evaluation.' };
      if (s <= 19) return { level: 'Moderately Severe',   color: 'red',    note: 'Moderately severe depression. Active treatment recommended.' };
      return             { level: 'Severe',               color: 'red',    note: 'Severe depression. Immediate treatment and referral required.' };
    },
  },

  gad7: {
    id: 'gad7',
    name: 'GAD-7',
    fullName: 'Generalized Anxiety Disorder-7',
    description: 'Anxiety severity screening',
    category: 'clinical',
    minutes: 4,
    badge: 'Anxiety',
    badgeColor: 'purple',
    instructions: 'Over the last 2 weeks, how often have you been bothered by any of the following problems?',
    scale: SCALE_04,
    questions: [
      'Feeling nervous, anxious, or on edge',
      'Not being able to stop or control worrying',
      'Worrying too much about different things',
      'Trouble relaxing',
      'Being so restless that it is hard to sit still',
      'Becoming easily annoyed or irritable',
      'Feeling afraid, as if something awful might happen',
    ],
    score(answers) {
      return { total: answers.reduce((s, v) => s + v, 0) };
    },
    interpret(scores) {
      const s = scores.total;
      if (s <= 4)  return { level: 'Minimal',  color: 'green',  note: 'Minimal anxiety symptoms.' };
      if (s <= 9)  return { level: 'Mild',     color: 'yellow', note: 'Mild anxiety. Self-help strategies recommended.' };
      if (s <= 14) return { level: 'Moderate', color: 'orange', note: 'Moderate anxiety. Consider counseling or further evaluation.' };
      return           { level: 'Severe',   color: 'red',    note: 'Severe anxiety. Prompt treatment and possible referral recommended.' };
    },
  },

  dass21: {
    id: 'dass21',
    name: 'DASS-21',
    fullName: 'Depression Anxiety Stress Scales-21',
    description: 'Depression, anxiety & stress — three subscales',
    category: 'clinical',
    minutes: 8,
    badge: 'D·A·S',
    badgeColor: 'indigo',
    instructions: 'Please read each statement and indicate how much the statement applied to you over the past week.',
    scale: SCALE_DASS,
    questions: [
      'I found myself getting upset by quite trivial things',
      'I was aware of dryness of my mouth',
      'I couldn\'t seem to experience any positive feeling at all',
      'I experienced breathing difficulty (e.g. excessively rapid breathing, breathlessness in the absence of physical exertion)',
      'I just couldn\'t seem to get going',
      'I tended to over-react to situations',
      'I had a feeling of shakiness (e.g. legs going to give way)',
      'I found it difficult to relax',
      'I found myself in situations that made me so anxious I was most relieved when they ended',
      'I felt that I had nothing to look forward to',
      'I found myself getting upset rather easily',
      'I felt that I was using a lot of nervous energy',
      'I felt sad and depressed',
      'I found myself getting impatient when I was delayed in any way (e.g. elevators, traffic lights, being kept waiting)',
      'I had a feeling of faintness',
      'I felt that I had lost interest in just about everything',
      'I felt I wasn\'t worth much as a person',
      'I felt that I was rather touchy',
      'I perspired noticeably (e.g. hands sweaty) in the absence of high temperatures or physical exertion',
      'I felt scared without any good reason',
      'I felt that life wasn\'t worthwhile',
    ],
    // D indices: 2,4,9,12,15,16,20
    // A indices: 1,3,6,8,14,18,19
    // S indices: 0,5,7,10,11,13,17
    score(answers) {
      const sum = (idxs) => idxs.reduce((s, i) => s + (answers[i] || 0), 0) * 2;
      return {
        depression: sum([2, 4, 9, 12, 15, 16, 20]),
        anxiety:    sum([1, 3, 6, 8, 14, 18, 19]),
        stress:     sum([0, 5, 7, 10, 11, 13, 17]),
      };
    },
    interpret(scores) {
      const d = (s) => s <= 9 ? 'Normal' : s <= 13 ? 'Mild' : s <= 20 ? 'Moderate' : s <= 27 ? 'Severe' : 'Extremely Severe';
      const a = (s) => s <= 7 ? 'Normal' : s <= 9 ? 'Mild' : s <= 14 ? 'Moderate' : s <= 19 ? 'Severe' : 'Extremely Severe';
      const st = (s) => s <= 14 ? 'Normal' : s <= 18 ? 'Mild' : s <= 25 ? 'Moderate' : s <= 33 ? 'Severe' : 'Extremely Severe';
      return {
        depression: { score: scores.depression, level: d(scores.depression) },
        anxiety:    { score: scores.anxiety,    level: a(scores.anxiety) },
        stress:     { score: scores.stress,     level: st(scores.stress) },
      };
    },
  },

  riasec: {
    id: 'riasec',
    name: 'RIASEC',
    fullName: 'Holland\'s Career Interest Inventory',
    description: 'Career interest type — Realistic, Investigative, Artistic, Social, Enterprising, Conventional',
    category: 'career',
    minutes: 10,
    badge: 'Career',
    badgeColor: 'green',
    instructions: 'Rate how much you would enjoy each of the following activities.',
    scale: SCALE_LIKERT5,
    questions: [
      // Realistic (0–5)
      'Build or repair furniture, electronics, or appliances',
      'Operate machinery or power tools',
      'Work with plants, animals, or in the outdoors',
      'Read maps, technical manuals, or blueprints',
      'Fix or maintain vehicles or mechanical equipment',
      'Work with your hands to construct or assemble things',
      // Investigative (6–11)
      'Conduct science experiments or research',
      'Analyse data or solve complex logic problems',
      'Read scientific, medical, or technical journals',
      'Study how living organisms or systems work',
      'Investigate the causes behind events or phenomena',
      'Work in a laboratory or research environment',
      // Artistic (12–17)
      'Create artwork, music, or creative writing',
      'Design websites, logos, or visual materials',
      'Perform on stage — theatre, dance, or music',
      'Decorate spaces or design interiors',
      'Write stories, scripts, or creative content',
      'Express ideas through visual or performing arts',
      // Social (18–23)
      'Help people solve personal or emotional problems',
      'Teach, train, or tutor others',
      'Volunteer in community or charity work',
      'Work as part of a team toward shared goals',
      'Counsel, advise, or mentor people',
      'Organise activities or events for groups',
      // Enterprising (24–29)
      'Lead a team or organisation',
      'Start or manage a business venture',
      'Persuade or influence others toward your views',
      'Negotiate contracts or close important deals',
      'Set ambitious goals and develop strategies to reach them',
      'Take calculated risks to achieve major outcomes',
      // Conventional (30–35)
      'Maintain detailed records, files, or logs',
      'Follow procedures and instructions precisely',
      'Work with numbers, accounts, or budgets',
      'Organise data in spreadsheets or databases',
      'Check documents or reports carefully for errors',
      'Follow established rules and structured routines',
    ],
    score(answers) {
      const sum = (start) => answers.slice(start, start + 6).reduce((s, v) => s + (v || 0), 0);
      return { R: sum(0), I: sum(6), A: sum(12), S: sum(18), E: sum(24), C: sum(30) };
    },
    interpret(scores) {
      const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
      const topCode = sorted.slice(0, 3).map(([k]) => k).join('');
      const desc = {
        R: 'Realistic — hands-on, practical, technical',
        I: 'Investigative — analytical, intellectual, research-driven',
        A: 'Artistic — creative, expressive, original',
        S: 'Social — empathetic, helpful, people-oriented',
        E: 'Enterprising — leadership, persuasive, goal-driven',
        C: 'Conventional — organised, detail-oriented, structured',
      };
      return { topCode, sorted, desc };
    },
  },

  tipi: {
    id: 'tipi',
    name: 'Big Five (TIPI)',
    fullName: 'Ten-Item Personality Inventory',
    description: 'Brief personality profile — Big Five dimensions',
    category: 'personality',
    minutes: 3,
    badge: 'Personality',
    badgeColor: 'pink',
    instructions: 'Rate how well each pair of traits describes you. There are no right or wrong answers.',
    scale: SCALE_TIPI,
    questions: [
      'Extraverted, enthusiastic',
      'Critical, quarrelsome',
      'Dependable, self-disciplined',
      'Anxious, easily upset',
      'Open to new experiences, complex',
      'Reserved, quiet',
      'Sympathetic, warm',
      'Disorganized, careless',
      'Calm, emotionally stable',
      'Conventional, uncreative',
    ],
    score(answers) {
      const rev = (v) => 8 - v;
      return {
        extraversion:       +((answers[0] + rev(answers[5])) / 2).toFixed(2),
        agreeableness:      +((rev(answers[1]) + answers[6]) / 2).toFixed(2),
        conscientiousness:  +((answers[2] + rev(answers[7])) / 2).toFixed(2),
        emotionalStability: +((rev(answers[3]) + answers[8]) / 2).toFixed(2),
        openness:           +((answers[4] + rev(answers[9])) / 2).toFixed(2),
      };
    },
    interpret(scores) {
      const lvl = (s) => s >= 5.5 ? 'High' : s >= 3.5 ? 'Moderate' : 'Low';
      return {
        extraversion:       { score: scores.extraversion,       level: lvl(scores.extraversion),       desc: scores.extraversion >= 5.5       ? 'Outgoing, energetic, sociable'             : 'Reserved, reflective, prefers solitude' },
        agreeableness:      { score: scores.agreeableness,      level: lvl(scores.agreeableness),      desc: scores.agreeableness >= 5.5      ? 'Cooperative, trusting, empathetic'          : 'Competitive, skeptical, challenging' },
        conscientiousness:  { score: scores.conscientiousness,  level: lvl(scores.conscientiousness),  desc: scores.conscientiousness >= 5.5  ? 'Organised, disciplined, goal-oriented'      : 'Flexible, spontaneous, adaptable' },
        emotionalStability: { score: scores.emotionalStability, level: lvl(scores.emotionalStability), desc: scores.emotionalStability >= 5.5 ? 'Calm, composed, emotionally resilient'       : 'Sensitive, emotionally reactive' },
        openness:           { score: scores.openness,           level: lvl(scores.openness),           desc: scores.openness >= 5.5           ? 'Curious, imaginative, open to change'       : 'Practical, conventional, focused' },
      };
    },
  },
};

export const ASSESSMENT_LIST = Object.values(ASSESSMENTS);

export const BADGE_COLORS = {
  blue:   'bg-blue-100 text-blue-700 border-blue-200',
  purple: 'bg-purple-100 text-purple-700 border-purple-200',
  indigo: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  green:  'bg-green-100 text-green-700 border-green-200',
  pink:   'bg-pink-100 text-pink-700 border-pink-200',
};
