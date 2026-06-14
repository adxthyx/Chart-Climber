import { Bike, Coins, Flame, Gauge } from 'lucide-react';

/**
 * Presentational illustration of the in-game view: a faux HUD over an SVG
 * price-chart terrain with a rider, coins and a flag. Pure SVG, theme-aware.
 */
export function GameMockup({ className = '' }: { className?: string }) {
  const W = 760;
  const H = 420;
  // Normalized chart shape (0..1, 1 = peak). Illustrative.
  const series = [
    0.32, 0.3, 0.42, 0.38, 0.55, 0.62, 0.5, 0.6, 0.74, 0.68, 0.82, 0.78, 0.9, 0.85, 0.72, 0.8,
    0.66, 0.58, 0.7, 0.62,
  ];
  const padX = 24;
  const top = 96;
  const bottom = H - 12;
  const usableW = W - padX * 2;
  const stepX = usableW / (series.length - 1);
  const yOf = (v: number) => top + (1 - v) * (bottom - top - 40);
  const pts = series.map((v, i) => [padX + i * stepX, yOf(v)] as const);
  const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${padX},${bottom} ${line} ${W - padX},${bottom}`;

  // Bike sits on a peak ~70% along.
  const riderIdx = 12;
  const [rx, ry] = pts[riderIdx];
  // Coins on a few local highs.
  const coinIdx = [4, 8, 18];

  return (
    <div className={`relative ${className}`}>
      <div className="card-surface overflow-hidden shadow-2xl shadow-black/10 ring-1 ring-black/5 dark:ring-white/5">
        {/* Faux HUD */}
        <div className="flex items-center gap-3 border-b border-border/70 bg-elevated/60 px-4 py-2.5">
          <span className="inline-flex items-center gap-1.5 text-sm font-bold tracking-tight text-brand">
            <span className="h-2 w-2 rounded-full bg-up" /> NVDA
          </span>
          <span className="rounded-md bg-up/15 px-1.5 py-0.5 text-[10px] font-semibold text-up">
            LIVE
          </span>
          <div className="ml-auto hidden items-center gap-4 text-xs font-medium text-muted-foreground sm:flex">
            <span className="inline-flex items-center gap-1">
              <Gauge className="h-3.5 w-3.5" /> 1,284 m
            </span>
            <span className="inline-flex items-center gap-1 text-amber-500">
              <Coins className="h-3.5 w-3.5" /> 37
            </span>
          </div>
          <span className="inline-flex items-center gap-1.5">
            <Flame className="h-3.5 w-3.5 text-brand" />
            <span className="h-1.5 w-16 overflow-hidden rounded-full bg-border">
              <span className="block h-full w-2/3 rounded-full bg-brand-gradient" />
            </span>
          </span>
        </div>

        {/* Terrain scene */}
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="block w-full"
          preserveAspectRatio="xMidYMid slice"
          role="img"
          aria-label="A bike riding across a stock chart shaped as terrain"
        >
          <defs>
            <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--brand))" stopOpacity="0.10" />
              <stop offset="100%" stopColor="hsl(var(--brand))" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="hill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--brand))" stopOpacity="0.55" />
              <stop offset="100%" stopColor="hsl(var(--brand))" stopOpacity="0.06" />
            </linearGradient>
          </defs>

          <rect x="0" y="0" width={W} height={H} fill="url(#sky)" />

          {/* faint grid */}
          {[0.25, 0.5, 0.75].map((g) => (
            <line
              key={g}
              x1="0"
              x2={W}
              y1={top + g * (bottom - top)}
              y2={top + g * (bottom - top)}
              stroke="hsl(var(--border))"
              strokeWidth="1"
              strokeDasharray="2 8"
            />
          ))}

          <polygon points={area} fill="url(#hill)" />
          <polyline
            points={line}
            fill="none"
            stroke="hsl(var(--brand))"
            strokeWidth="3"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* coins */}
          {coinIdx.map((i) => {
            const [cx, cy] = pts[i];
            return (
              <g key={i} className="animate-float" style={{ animationDelay: `${i * 0.3}s` }}>
                <circle cx={cx} cy={cy - 26} r="9" fill="#fbbf24" stroke="#f59e0b" strokeWidth="2" />
                <circle cx={cx} cy={cy - 26} r="3.5" fill="#fde68a" />
              </g>
            );
          })}

          {/* finish flag */}
          <g>
            <line
              x1={W - padX}
              y1={pts[pts.length - 1][1]}
              x2={W - padX}
              y2={pts[pts.length - 1][1] - 46}
              stroke="hsl(var(--foreground))"
              strokeWidth="2.5"
            />
            <polygon
              points={`${W - padX},${pts[pts.length - 1][1] - 46} ${W - padX - 26},${
                pts[pts.length - 1][1] - 38
              } ${W - padX},${pts[pts.length - 1][1] - 30}`}
              fill="hsl(var(--brand))"
            />
          </g>

          {/* rider marker */}
          <g transform={`translate(${rx - 20}, ${ry - 44})`}>
            <circle cx="20" cy="20" r="22" fill="hsl(var(--brand))" />
            <foreignObject x="8" y="8" width="24" height="24">
              <Bike className="h-6 w-6 text-white" strokeWidth={2.4} />
            </foreignObject>
          </g>
        </svg>
      </div>

      {/* floating glow */}
      <div className="glow-brand pointer-events-none absolute -inset-8 -z-10 blur-2xl" />
    </div>
  );
}
