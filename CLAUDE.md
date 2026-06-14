# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## What this is

Hill-Climb-Racing-style browser game where the terrain is a stock/crypto price chart. Green days = climbs, red days = drops. Built on Next.js 16 App Router + TypeScript, Matter.js (physics only), Canvas 2D (rendering), Tailwind 4, and Zustand 5.

## Commands

```bash
npm run dev          # dev server on :3000
npm run build        # production build
npm run lint         # ESLint
npm run gen:data     # regenerate lib/data/static/*.json + registry.ts (seeded, deterministic)
```

No env vars required. Optional: `STOCK_API_KEY=your_key npm run dev` enables live equity data.

## Architecture

**Data flow:** `lib/data/` → `app/api/chart/` → `components/GameClient` → `lib/game/` → Canvas

### Data layer (`lib/data/`)

- `assets.ts` — asset catalog (AAPL, TSLA, NVDA, RELIANCE, TCS, INFY, BTC, ETH) + `ASSET_BY_SYMBOL` map
- `types.ts` — `PricePoint`, `ChartSeries`, `Range` (`1M | 6M | 1Y | 5Y`)
- `static/registry.ts` + `static/*.json` — bundled illustrative series, keyed `${SYMBOL}_${RANGE}`
- `fetchChart.ts` — `getChart(symbol, range)` tries `/api/chart` proxy first, falls back to static; `staticChart()` is the infallible path
- `generate.ts` + `scripts/gen-data.mts` — seeded deterministic generator for bundled JSON
- `sparkline.ts` — `sparkAllRanges(symbol)` for the picker preview thumbnails

### API route (`app/api/chart/route.ts`)

Proxies CoinGecko (crypto, free) and a Twelve-Data-style adapter (equities, needs `STOCK_API_KEY`). Returns bundled static data with `200` on any upstream failure — client never breaks.

### Routes (`app/`)

- `/` (`app/page.tsx`) — server component; renders `AssetPicker` with precomputed sparklines
- `/game/[symbol]` (`app/game/[symbol]/page.tsx`) — server component; validates symbol + range, renders `GameClient`; `generateStaticParams` pre-renders all known symbols

### Game layer (`lib/game/`)

All game logic is pure TypeScript — no React inside.

- `constants.ts` — **all tuning lives here**: gravity, torques, terrain dimensions, colors, collision categories. Change feel here, not in physics/render modules.
- `terrain.ts` — `buildTerrain(points)`: maps price → canvas Y (highest price = smallest Y = top of hill), adds flat runway prefix/suffix, Catmull-Rom smoothing (`RESAMPLE_SUB`), builds one convex Matter.js quad per segment down to `floorY`, places coins at local price peaks and fuel cans at `FUEL_SPACING` intervals
- `bike.ts` — constructs chassis + 2 wheels as Matter.js bodies with constraints; `driveWheels`, `applyPitch`
- `engine.ts` — `createGameEngine(points)`: owns the Matter world, collision events (head-hit = crash, wheel contact tracking for airborne), per-frame `step(input, dt)` + `getState()`. Game-over reasons: `crash` (head hit terrain), `fell` (below `floorY`), `fuel` (empty tank + stalled >1.5 s), or `finished` (reached end)
- `camera.ts` — lerped follow cam with lookahead
- `input.ts` — keyboard (→/D/↑ = gas, ←/A/↓ = brake) + touch passthrough via `setTouchGas/setTouchBrake`
- `loop.ts` — fixed-timestep `requestAnimationFrame` loop; calls `step` then `render`
- `renderer.ts` — `draw(ctx, engine, state, opts)`: Canvas 2D only, reads terrain/coins/fuels/bike from engine

### Components (`components/`)

- `GameClient` — `'use client'` wrapper; fetches chart data, shows loading/error states, mounts `GameCanvas` + `HUD` + `GameOverModal`
- `GameCanvas` — `'use client'`; owns the `<canvas>`, wires ResizeObserver for DPR, instantiates engine + input + loop, throttles HUD updates to ~11 Hz, calls `useGameStore.endRun` on game-over
- `HUD`, `TouchControls`, `GameOverModal`, `Sparkline` — UI chrome only, read from `useGameStore`

### State (`store/useGameStore.ts`)

Zustand store with `persist` middleware. Phases: `loading → playing → crashed`. Only `best` scores (keyed by symbol) are persisted to `localStorage`; all other state is ephemeral per run.

## Key invariants

- **No physics in renderer, no rendering in physics.** `lib/game/engine.ts` runs Matter.js; `lib/game/renderer.ts` reads state and draws — they never cross.
- **Static data is always the fallback.** Every code path that calls the live API must end at `staticChart()` on failure.
- **Terrain is built once per game session** from `PricePoint[]`. To change terrain behavior edit `terrain.ts` or `constants.ts`; don't mutate terrain bodies after construction.
- **`constants.ts` is config.** Game feel tuning belongs there (gravity, torques, segment width, colors). Avoid magic numbers in other game files.
