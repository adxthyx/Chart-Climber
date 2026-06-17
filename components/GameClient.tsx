'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { getChart } from '@/lib/data/fetchChart';
import type { AssetMeta, ChartSeries, Range } from '@/lib/data/types';
import { useGameStore } from '@/store/useGameStore';
import { GameCanvas } from './GameCanvas';
import { GameOverModal } from './GameOverModal';
import { HUD } from './HUD';

export function GameClient({
  symbol,
  range,
  meta,
}: {
  symbol: string;
  range: Range;
  meta: AssetMeta;
}) {
  // Tag the loaded series with its key so a symbol/range change shows loading
  // without a synchronous setState reset inside the effect.
  const key = `${symbol}_${range}`;
  const [loaded, setLoaded] = useState<{ key: string; data: ChartSeries } | null>(null);
  const [runId, setRunId] = useState(0);
  const resetRun = useGameStore((s) => s.resetRun);

  useEffect(() => {
    let alive = true;
    getChart(symbol, range).then((s) => {
      if (alive) setLoaded({ key, data: s });
    });
    return () => {
      alive = false;
    };
  }, [symbol, range, key]);

  const series = loaded?.key === key ? loaded.data : null;

  const onRetry = () => {
    resetRun();
    setRunId((r) => r + 1);
  };

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-[#070b14] text-white">
      <Link
        href="/play"
        className="absolute left-3 top-3 z-30 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/40 px-3 py-1.5 text-xs font-semibold text-white/80 backdrop-blur transition hover:bg-white/15 active:scale-95"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Assets
      </Link>

      {series ? (
        <>
          <HUD meta={meta} live={series.live} />
          <GameCanvas key={runId} points={series.points} meta={meta} />
          <GameOverModal meta={meta} onRetry={onRetry} />
          <ControlsHint />
        </>
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-3 text-white/60">
          <Loader2 className="h-7 w-7 animate-spin text-white/80" />
          <p className="text-sm font-medium">
            Building <span style={{ color: meta.accent }}>{symbol}</span> terrain…
          </p>
        </div>
      )}
    </div>
  );
}

function ControlsHint() {
  const phase = useGameStore((s) => s.phase);
  const [show, setShow] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setShow(false), 4000);
    return () => clearTimeout(t);
  }, []);
  if (!show || phase === 'crashed') return null;
  return (
    <div className="animate-fade-in pointer-events-none absolute inset-x-0 bottom-6 z-10 flex items-center justify-center gap-2 text-center text-xs text-white/60">
      <kbd className="rounded-md border border-white/15 bg-white/10 px-2 py-1 font-mono font-semibold">
        →
      </kbd>
      <span>gas</span>
      <span className="text-white/30">·</span>
      <kbd className="rounded-md border border-white/15 bg-white/10 px-2 py-1 font-mono font-semibold">
        ←
      </kbd>
      <span>brake</span>
    </div>
  );
}
