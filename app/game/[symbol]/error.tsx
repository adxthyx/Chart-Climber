'use client';

import Link from 'next/link';
import { AlertTriangle, LayoutGrid, RotateCcw } from 'lucide-react';

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex h-[100dvh] w-full flex-col items-center justify-center gap-5 bg-[#070b14] px-6 text-center text-white">
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/15 text-red-300">
        <AlertTriangle className="h-7 w-7" />
      </span>
      <div>
        <p className="text-lg font-semibold">This level failed to load</p>
        <p className="mt-1 text-sm text-white/50">The terrain couldn&apos;t be built. Try again.</p>
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="bg-brand-gradient inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 active:scale-95"
        >
          <RotateCcw className="h-4 w-4" />
          Try again
        </button>
        <Link
          href="/play"
          className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10 active:scale-95"
        >
          <LayoutGrid className="h-4 w-4" />
          Assets
        </Link>
      </div>
    </div>
  );
}
