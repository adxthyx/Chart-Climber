'use client';

import Link from 'next/link';
import {
  Coins,
  Fuel,
  LayoutGrid,
  RotateCcw,
  Ruler,
  Skull,
  TrendingDown,
  Trophy,
  Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { AssetMeta } from '@/lib/data/types';
import { useGameStore } from '@/store/useGameStore';

const META: Record<string, { title: string; icon: LucideIcon }> = {
  crash: { title: 'Wiped Out', icon: Skull },
  fuel: { title: 'Out of Fuel', icon: Fuel },
  fell: { title: 'Off the Chart', icon: TrendingDown },
};

export function GameOverModal({ meta, onRetry }: { meta: AssetMeta; onRetry: () => void }) {
  const phase = useGameStore((s) => s.phase);
  const hud = useGameStore((s) => s.hud);
  const finished = useGameStore((s) => s.finished);
  const reason = useGameStore((s) => s.reason);
  const best = useGameStore((s) => s.best[meta.symbol] ?? 0);

  if (phase !== 'crashed') return null;

  const info = finished
    ? { title: 'Chart Conquered!', icon: Trophy }
    : (reason && META[reason]) || { title: 'Game Over', icon: Skull };
  const Icon = info.icon;
  const isRecord = hud.score >= best && hud.score > 0;

  return (
    <div className="animate-fade-in absolute inset-0 z-20 flex items-center justify-center bg-black/65 p-5 backdrop-blur-sm">
      <div className="animate-fade-up w-full max-w-sm rounded-2xl border border-white/10 bg-[#14181c] p-6 text-center text-white shadow-2xl">
        <span
          className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl"
          style={{ backgroundColor: `${meta.accent}22`, color: meta.accent }}
        >
          <Icon className="h-7 w-7" />
        </span>
        <h2 className="mt-4 text-2xl font-bold tracking-tight">{info.title}</h2>
        <p className="mt-1 text-sm text-white/50">{meta.name}</p>

        <div className="my-5 grid grid-cols-3 gap-3">
          <Box icon={Ruler} label="Distance" value={`${Math.round(hud.distance)} m`} />
          <Box icon={Coins} label="Coins" value={`${hud.coins}`} />
          <Box icon={Wallet} label="Portfolio" value={hud.score.toLocaleString()} />
        </div>

        {isRecord ? (
          <p className="mb-4 inline-flex items-center justify-center gap-1.5 rounded-full bg-amber-400/15 px-3 py-1 text-sm font-semibold text-amber-300">
            <Trophy className="h-4 w-4" /> New best for {meta.symbol}!
          </p>
        ) : (
          <p className="mb-4 text-sm text-white/50">
            Best: <span className="font-mono text-white/80">{best.toLocaleString()}</span>
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onRetry}
            className="bg-brand-gradient inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold text-white transition hover:brightness-110 active:scale-95"
          >
            <RotateCcw className="h-4 w-4" />
            Retry
          </button>
          <Link
            href="/play"
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/15 py-2.5 text-sm font-semibold text-white/80 transition hover:bg-white/10 active:scale-95"
          >
            <LayoutGrid className="h-4 w-4" />
            Assets
          </Link>
        </div>
      </div>
    </div>
  );
}

function Box({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/5 px-2 py-3">
      <Icon className="mx-auto h-4 w-4 text-white/40" />
      <div className="mt-1.5 text-[10px] uppercase tracking-widest text-white/40">{label}</div>
      <div className="mt-0.5 font-mono text-sm font-semibold tabular-nums">{value}</div>
    </div>
  );
}
