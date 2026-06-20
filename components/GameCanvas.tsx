'use client';

import { useEffect, useRef } from 'react';
import type { AssetMeta, PricePoint } from '@/lib/data/types';
import { createGameEngine } from '@/lib/game/engine';
import { createInput, type InputController } from '@/lib/game/input';
import { createLoop } from '@/lib/game/loop';
import { draw } from '@/lib/game/renderer';
import { useGameStore } from '@/store/useGameStore';
import { TouchControls } from './TouchControls';

export function GameCanvas({
  points,
  meta,
}: {
  points: PricePoint[];
  meta: AssetMeta;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<InputController | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const store = useGameStore.getState();
    const engine = createGameEngine(points);
    const input = createInput();
    input.attach();
    inputRef.current = input;

    let cssW = 0;
    let cssH = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      cssW = rect.width;
      cssH = rect.height;
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      engine.setViewport(cssW, cssH);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    store.setPhase('playing');
    let ended = false;
    let lastHud = 0;

    const step = (dt: number) => {
      engine.step(input.state, dt);
    };

    const render = (alpha: number) => {
      const state = engine.getState(alpha);
      // dpr transform persists; draw in CSS pixels.
      draw(ctx, engine, state, { w: cssW, h: cssH, accent: meta.accent, symbol: meta.symbol }, alpha);

      const now = performance.now();
      if (now - lastHud > 90) {
        lastHud = now;
        useGameStore.getState().setHud({
          distance: state.distance,
          price: state.price,
          speed: state.bike.speed,
          fuel: state.fuel,
          score: state.score,
          coins: state.coinsCollected,
          airborne: state.bike.airborne,
          flips: state.flips,
        });
      }

      if (state.over && !ended) {
        ended = true;
        useGameStore.getState().endRun(meta.symbol, state.score, state.finished, state.reason);
      }
    };

    const loop = createLoop(step, render);
    loop.start();

    return () => {
      loop.stop();
      ro.disconnect();
      input.detach();
      engine.destroy();
      inputRef.current = null;
    };
  }, [points, meta]);

  return (
    <div className="absolute inset-0">
      <canvas ref={canvasRef} className="no-touch-scroll h-full w-full" />
      <TouchControls
        onGas={(on) => inputRef.current?.setTouchGas(on)}
        onBrake={(on) => inputRef.current?.setTouchBrake(on)}
      />
    </div>
  );
}
