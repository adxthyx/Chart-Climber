'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  Coins,
  Fuel,
  LayoutGrid,
  Loader2,
  Medal,
  RotateCcw,
  Ruler,
  Send,
  Skull,
  TrendingDown,
  Trophy,
  Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { AssetMeta, Range } from '@/lib/data/types';
import { fmtDistance } from '@/lib/format';
import {
  MAX_NAME_LENGTH,
  submitScore,
  type LeaderboardEntry,
} from '@/lib/leaderboard';
import { useGameStore } from '@/store/useGameStore';

const META: Record<string, { title: string; icon: LucideIcon }> = {
  crash: { title: 'Wiped Out', icon: Skull },
  fuel: { title: 'Out of Fuel', icon: Fuel },
  fell: { title: 'Off the Chart', icon: TrendingDown },
};

type Submission =
  | { state: 'idle' }
  | { state: 'sending' }
  | { state: 'done'; rank: number; entries: LeaderboardEntry[] }
  | { state: 'failed' };

export function GameOverModal({
  meta,
  range,
  onRetry,
}: {
  meta: AssetMeta;
  range: Range;
  onRetry: () => void;
}) {
  const phase = useGameStore((s) => s.phase);
  const hud = useGameStore((s) => s.hud);
  const finished = useGameStore((s) => s.finished);
  const reason = useGameStore((s) => s.reason);
  const best = useGameStore((s) => s.best[meta.symbol] ?? 0);
  const playerName = useGameStore((s) => s.playerName);
  const setPlayerName = useGameStore((s) => s.setPlayerName);
  const [submission, setSubmission] = useState<Submission>({ state: 'idle' });

  if (phase !== 'crashed') return null;

  const info = finished
    ? { title: 'Chart Conquered!', icon: Trophy }
    : (reason && META[reason]) || { title: 'Game Over', icon: Skull };
  const Icon = info.icon;
  const isRecord = hud.score >= best && hud.score > 0;

  const submit = async () => {
    setSubmission({ state: 'sending' });
    const res = await submitScore({
      symbol: meta.symbol,
      range,
      name: playerName,
      score: hud.score,
      distance: hud.distance,
      coins: hud.coins,
      finished,
    });
    setSubmission(
      res.enabled
        ? { state: 'done', rank: res.rank, entries: res.entries }
        : { state: 'failed' },
    );
  };

  const retry = () => {
    setSubmission({ state: 'idle' });
    onRetry();
  };

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
          <Box icon={Ruler} label="Distance" value={fmtDistance(hud.distance)} />
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

        {submission.state === 'done' ? (
          <Leaderboard entries={submission.entries} rank={submission.rank} accent={meta.accent} />
        ) : (
          <div className="mb-4 flex gap-2">
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value.slice(0, MAX_NAME_LENGTH))}
              placeholder="Name (optional)"
              maxLength={MAX_NAME_LENGTH}
              className="min-w-0 flex-1 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-white/40 focus:outline-none"
            />
            <button
              type="button"
              onClick={submit}
              disabled={submission.state === 'sending'}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/15 px-3 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10 active:scale-95 disabled:opacity-50"
            >
              {submission.state === 'sending' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Submit
            </button>
          </div>
        )}
        {submission.state === 'failed' && (
          <p className="mb-4 text-xs text-red-400/80">Leaderboard unavailable — score not saved.</p>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={retry}
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

function Leaderboard({
  entries,
  rank,
  accent,
}: {
  entries: LeaderboardEntry[];
  rank: number;
  accent: string;
}) {
  return (
    <div className="mb-4 rounded-xl border border-white/5 bg-white/5 p-3 text-left">
      <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-white/40">
        <Medal className="h-3.5 w-3.5" /> Leaderboard
        {rank > 0 && (
          <span className="normal-case tracking-normal" style={{ color: accent }}>
            — you ranked #{rank}
          </span>
        )}
      </p>
      <ol className="space-y-1">
        {entries.map((e, i) => (
          <li
            key={e.id}
            className="flex items-center gap-2 font-mono text-xs tabular-nums text-white/80"
          >
            <span className="w-5 text-white/40">{i + 1}.</span>
            <span className="flex-1 truncate">{e.name}</span>
            <span>{e.score.toLocaleString()}</span>
          </li>
        ))}
      </ol>
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
