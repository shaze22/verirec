// Lightweight pure-SVG line chart for assessment score trends.
// Inherits stroke/fill from text color (set via className, e.g. text-violet-600).
// `series`: [{ value: number, date: string }]  ·  `max`: y-axis ceiling.
export default function ScoreTrendChart({ series = [], max = 27, className = 'text-violet-600' }) {
  const W = 300, H = 90, P = 8;
  const pts = series.filter(s => typeof s.value === 'number');
  if (pts.length === 0) return null;

  const n = pts.length;
  const x = (i) => n === 1 ? W / 2 : P + (i * (W - P * 2)) / (n - 1);
  const y = (v) => H - P - (Math.max(0, Math.min(v, max)) / max) * (H - P * 2);

  const linePath = pts.map((s, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(s.value).toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L ${x(n - 1).toFixed(1)} ${H - P} L ${x(0).toFixed(1)} ${H - P} Z`;
  const gid = `g${Math.round(max)}-${n}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={`w-full h-auto ${className}`} preserveAspectRatio="none" role="img" aria-label="Score trend">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.18" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gid})`} stroke="none" />
      <path d={linePath} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((s, i) => (
        <circle key={i} cx={x(i)} cy={y(s.value)} r={i === n - 1 ? 4 : 3}
          fill="currentColor" stroke="#fff" strokeWidth="1.5" />
      ))}
    </svg>
  );
}
