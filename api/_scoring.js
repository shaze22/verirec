// Server-side scoring for clinical and career assessments
// PHQ-9, GAD-7, DASS-21: public domain / free for clinical use
// RIASEC: Holland (1973) public domain
// TIPI: Gosling et al. (2003) public domain

const VALID_TESTS = new Set(['phq9', 'gad7', 'dass21', 'riasec', 'tipi']);

export function scoreAssessment(testId, answers) {
  if (!VALID_TESTS.has(testId)) throw new Error(`Unknown test: ${testId}`);
  if (!Array.isArray(answers)) throw new Error('answers must be an array');

  switch (testId) {
    case 'phq9':
    case 'gad7':
      return { total: answers.reduce((s, v) => s + (Number(v) || 0), 0) };

    case 'dass21': {
      const sum = (idxs) => idxs.reduce((s, i) => s + (Number(answers[i]) || 0), 0) * 2;
      return {
        depression: sum([2, 4, 9, 12, 15, 16, 20]),
        anxiety:    sum([1, 3, 6, 8, 14, 18, 19]),
        stress:     sum([0, 5, 7, 10, 11, 13, 17]),
      };
    }

    case 'riasec': {
      const sum = (start) => answers.slice(start, start + 6).reduce((s, v) => s + (Number(v) || 0), 0);
      return { R: sum(0), I: sum(6), A: sum(12), S: sum(18), E: sum(24), C: sum(30) };
    }

    case 'tipi': {
      const rev = (v) => 8 - Number(v);
      return {
        extraversion:       +((Number(answers[0]) + rev(answers[5])) / 2).toFixed(2),
        agreeableness:      +((rev(answers[1]) + Number(answers[6])) / 2).toFixed(2),
        conscientiousness:  +((Number(answers[2]) + rev(answers[7])) / 2).toFixed(2),
        emotionalStability: +((rev(answers[3]) + Number(answers[8])) / 2).toFixed(2),
        openness:           +((Number(answers[4]) + rev(answers[9])) / 2).toFixed(2),
      };
    }
  }
}

export function interpretAssessment(testId, scores) {
  if (!VALID_TESTS.has(testId)) throw new Error(`Unknown test: ${testId}`);

  switch (testId) {
    case 'phq9': {
      const s = scores.total;
      if (s <= 4)  return { level: 'Minimal',           color: 'green',  note: 'Minimal or no depression symptoms.' };
      if (s <= 9)  return { level: 'Mild',              color: 'yellow', note: 'Mild depression. Monitor and follow up.' };
      if (s <= 14) return { level: 'Moderate',          color: 'orange', note: 'Moderate depression. Consider counseling and further evaluation.' };
      if (s <= 19) return { level: 'Moderately Severe', color: 'red',    note: 'Moderately severe depression. Active treatment recommended.' };
      return               { level: 'Severe',           color: 'red',    note: 'Severe depression. Immediate treatment and referral required.' };
    }

    case 'gad7': {
      const s = scores.total;
      if (s <= 4)  return { level: 'Minimal',  color: 'green',  note: 'Minimal anxiety symptoms.' };
      if (s <= 9)  return { level: 'Mild',     color: 'yellow', note: 'Mild anxiety. Self-help strategies recommended.' };
      if (s <= 14) return { level: 'Moderate', color: 'orange', note: 'Moderate anxiety. Consider counseling or further evaluation.' };
      return               { level: 'Severe',  color: 'red',    note: 'Severe anxiety. Prompt treatment and possible referral recommended.' };
    }

    case 'dass21': {
      const d  = (s) => s <= 9  ? 'Normal' : s <= 13 ? 'Mild' : s <= 20 ? 'Moderate' : s <= 27 ? 'Severe' : 'Extremely Severe';
      const a  = (s) => s <= 7  ? 'Normal' : s <= 9  ? 'Mild' : s <= 14 ? 'Moderate' : s <= 19 ? 'Severe' : 'Extremely Severe';
      const st = (s) => s <= 14 ? 'Normal' : s <= 18 ? 'Mild' : s <= 25 ? 'Moderate' : s <= 33 ? 'Severe' : 'Extremely Severe';
      return {
        depression: { score: scores.depression, level: d(scores.depression) },
        anxiety:    { score: scores.anxiety,    level: a(scores.anxiety) },
        stress:     { score: scores.stress,     level: st(scores.stress) },
      };
    }

    case 'riasec': {
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
    }

    case 'tipi': {
      const lvl = (s) => s >= 5.5 ? 'High' : s >= 3.5 ? 'Moderate' : 'Low';
      return {
        extraversion:       { score: scores.extraversion,       level: lvl(scores.extraversion),       desc: scores.extraversion >= 5.5       ? 'Outgoing, energetic, sociable'         : 'Reserved, reflective, prefers solitude' },
        agreeableness:      { score: scores.agreeableness,      level: lvl(scores.agreeableness),      desc: scores.agreeableness >= 5.5      ? 'Cooperative, trusting, empathetic'     : 'Competitive, skeptical, challenging' },
        conscientiousness:  { score: scores.conscientiousness,  level: lvl(scores.conscientiousness),  desc: scores.conscientiousness >= 5.5  ? 'Organised, disciplined, goal-oriented' : 'Flexible, spontaneous, adaptable' },
        emotionalStability: { score: scores.emotionalStability, level: lvl(scores.emotionalStability), desc: scores.emotionalStability >= 5.5 ? 'Calm, composed, emotionally resilient'  : 'Sensitive, emotionally reactive' },
        openness:           { score: scores.openness,           level: lvl(scores.openness),           desc: scores.openness >= 5.5           ? 'Curious, imaginative, open to change'  : 'Practical, conventional, focused' },
      };
    }
  }
}
