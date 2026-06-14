'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Play, TrendingDown, TrendingUp } from 'lucide-react';
import type { AssetClass, AssetMeta, Range } from '@/lib/data/types';
import { RANGES } from '@/lib/data/types';
import { CLASS_LABEL } from '@/lib/data/assets';
import { Sparkline } from './Sparkline';

export type PickerAsset = {
  meta: AssetMeta;
  spark: Record<Range, number[]>;
};

const CLASS_ORDER: AssetClass[] = ['us', 'india', 'crypto'];

function AssetCard({ asset }: { asset: PickerAsset }) {
  const [range, setRange] = useState<Range>('1Y');
  const pts = asset.spark[range];
  const up = pts[pts.length - 1] >= pts[0];

  return (
    <div className="card-surface group flex flex-col p-5 transition hover:-translate-y-1 hover:border-brand/40 hover:shadow-lg hover:shadow-black/5">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight">{asset.meta.symbol}</span>
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: asset.meta.accent }}
              aria-hidden
            />
          </div>
          <div className="truncate text-xs text-muted-foreground">{asset.meta.name}</div>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
            up ? 'bg-up/12 text-up' : 'bg-down/12 text-down'
          }`}
        >
          {up ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
        </span>
      </div>

      <div className="my-1 rounded-lg bg-elevated/50 p-2">
        <Sparkline points={pts} accent={asset.meta.accent} />
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <div
          className="flex gap-1 rounded-full border border-border bg-card p-0.5"
          role="group"
          aria-label="Select range"
        >
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`focus-ring rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                r === range
                  ? 'bg-brand text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
        <Link
          href={`/game/${asset.meta.symbol}?range=${range}`}
          className="bg-brand-gradient focus-ring inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold text-white shadow-sm shadow-brand/30 transition hover:brightness-110 active:scale-95"
        >
          <Play className="h-3.5 w-3.5 fill-current" />
          Ride
        </Link>
      </div>
    </div>
  );
}

export function AssetPicker({ assets }: { assets: PickerAsset[] }) {
  return (
    <div className="flex flex-col gap-12">
      {CLASS_ORDER.map((cls) => {
        const group = assets.filter((a) => a.meta.class === cls);
        if (!group.length) return null;
        return (
          <section key={cls}>
            <div className="mb-5 flex items-center gap-4">
              <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {CLASS_LABEL[cls]}
              </h2>
              <span className="h-px flex-1 bg-border" />
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {group.map((a) => (
                <AssetCard key={a.meta.symbol} asset={a} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
