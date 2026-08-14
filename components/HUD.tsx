'use client';

import { Calendar, Coins, Gauge, Plane, RotateCw, Ruler, Wallet, Zap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { RANGE_INTRADAY, type AssetMeta, type Range } from '@/lib/data/types';
import { fmtDate, fmtDistance } from '@/lib/format';
import { FUEL_MAX } from '@/lib/game/constants';
import { useGameStore } from '@/store/useGameStore';

function fmtPrice(v: number, currency: 'USD' | 'INR') {
  const sym = currency === 'INR' ? '₹' : '$';
  return `${sym}${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function Stat({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 shrink-0 text-white/40" />
      <div className="flex flex-col leading-tight">
        <span className="text-[9px] font-medium uppercase tracking-widest text-white/40">
          {label}
        </span>
        <span className="font-mono text-sm font-semibold tabular-nums">{value}</span>
      </div>
    </div>
  );
}

export function HUD({ meta, range, live }: { meta: AssetMeta; range: Range; live: boolean }) {
  const hud = useGameStore((s) => s.hud);
  const fuelPct = Math.max(0, Math.min(100, (hud.fuel / FUEL_MAX) * 100));

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 px-3 pt-14 sm:p-4">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-x-5 gap-y-2.5 rounded-2xl border border-white/10 bg-black/45 px-4 py-2.5 shadow-lg shadow-black/20 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold tracking-tight" style={{ color: meta.accent }}>
            {meta.symbol}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide ${
              live ? 'bg-emerald-400/15 text-emerald-300' : 'bg-amber-400/15 text-amber-300'
            }`}
          >
            {live ? 'LIVE' : 'SIM'}
          </span>
        </div>

        <Stat icon={Ruler} label="Distance" value={fmtDistance(hud.distance)} />
        <Stat icon={Calendar} label="Date" value={fmtDate(hud.date, RANGE_INTRADAY[range])} />
        <Stat icon={Gauge} label="Price" value={fmtPrice(hud.price, meta.currency)} />
        <Stat icon={Zap} label="Speed" value={hud.speed.toFixed(1)} />
        <Stat icon={Coins} label="Coins" value={`${hud.coins}`} />
        <Stat icon={Wallet} label="Portfolio" value={hud.score.toLocaleString()} />

        <div className="ml-auto flex min-w-[130px] items-center gap-2">
          <span
            className={`text-[10px] font-bold uppercase tracking-widest ${
              fuelPct > 30 ? 'text-white/50' : 'text-red-300'
            }`}
          >
            Fuel
          </span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full transition-[width] duration-150"
              style={{
                width: `${fuelPct}%`,
                background: fuelPct > 30 ? 'linear-gradient(90deg,#34d399,#a3e635)' : '#f87171',
              }}
            />
          </div>
        </div>
      </div>

      <div className="mx-auto mt-2 flex max-w-4xl justify-center gap-2">
        {hud.airborne && (
          <div className="animate-fade-in inline-flex items-center gap-1.5 rounded-full bg-sky-400/20 px-3 py-1 text-xs font-bold text-sky-200">
            <Plane className="h-3.5 w-3.5" /> AIRBORNE
          </div>
        )}
        {hud.flips > 0 && (
          <div className="animate-fade-in inline-flex items-center gap-1.5 rounded-full bg-violet-400/20 px-3 py-1 text-xs font-bold text-violet-200">
            <RotateCw className="h-3.5 w-3.5" />
            {hud.flips}× FLIP +{(hud.flips * 300).toLocaleString()}
          </div>
        )}
      </div>
    </div>
  );
}
