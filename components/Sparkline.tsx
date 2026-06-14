// Pure SVG sparkline from normalized 0..1 points (1 = top). No client JS needed.
export function Sparkline({
  points,
  accent,
  width = 220,
  height = 64,
}: {
  points: number[];
  accent: string;
  width?: number;
  height?: number;
}) {
  if (points.length < 2) return null;
  const pad = 4;
  const w = width - pad * 2;
  const h = height - pad * 2;
  const stepX = w / (points.length - 1);
  const coords = points.map((v, i) => [pad + i * stepX, pad + (1 - v) * h] as const);
  const line = coords.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${pad},${height - pad} ${line} ${pad + w},${height - pad}`;
  const last = points[points.length - 1];
  const first = points[0];
  const up = last >= first;
  const id = `spark-${accent.replace('#', '')}-${up ? 'u' : 'd'}`;

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="block"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity="0.35" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${id})`} />
      <polyline
        points={line}
        fill="none"
        stroke={accent}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
