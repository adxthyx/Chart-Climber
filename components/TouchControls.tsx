'use client';

import { useSyncExternalStore } from 'react';

const noop = () => () => {};
const hasTouch = () =>
  typeof window !== 'undefined' &&
  ('ontouchstart' in window || navigator.maxTouchPoints > 0);

// On-screen gas/brake for touch devices. Hidden when no touch support.
// useSyncExternalStore gives a client-only value without an effect/setState or
// a hydration mismatch (server snapshot is always false).
export function TouchControls({
  onGas,
  onBrake,
}: {
  onGas: (on: boolean) => void;
  onBrake: (on: boolean) => void;
}) {
  const touch = useSyncExternalStore(noop, hasTouch, () => false);
  if (!touch) return null;

  const btn =
    'pointer-events-auto flex h-20 w-20 select-none items-center justify-center rounded-full border border-white/20 bg-black/40 text-2xl font-bold text-white/90 backdrop-blur active:scale-95 active:bg-white/20';

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-center justify-between p-5 sm:p-8">
      <button
        type="button"
        aria-label="Brake"
        className={btn}
        onPointerDown={(e) => {
          e.preventDefault();
          onBrake(true);
        }}
        onPointerUp={() => onBrake(false)}
        onPointerLeave={() => onBrake(false)}
        onPointerCancel={() => onBrake(false)}
      >
        ◀
      </button>
      <button
        type="button"
        aria-label="Gas"
        className={btn}
        onPointerDown={(e) => {
          e.preventDefault();
          onGas(true);
        }}
        onPointerUp={() => onGas(false)}
        onPointerLeave={() => onGas(false)}
        onPointerCancel={() => onGas(false)}
      >
        ▶
      </button>
    </div>
  );
}
