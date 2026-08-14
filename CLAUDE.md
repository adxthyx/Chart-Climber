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
npm run gen:data     # refetch real historical prices from Yahoo Finance into lib/data/static/*.json + registry.ts
```

No env vars required. Optional: `STOCK_API_KEY=your_key npm run dev` enables live equity data; `DATABASE_URL=<neon connection string>` enables the leaderboard (disabled gracefully without it).

## Architecture

**Data flow:** `lib/data/` → `app/api/chart/` → `components/GameClient` → `lib/game/` → Canvas

### Data layer (`lib/data/`)

- `assets.ts` — asset catalog metadata only (AAPL, TSLA, NVDA, RELIANCE, TCS, INFY, BTC, ETH) + `ASSET_BY_SYMBOL` map. No synthetic price params — all series are real market data.
- `types.ts` — `PricePoint`, `ChartSeries` (`live` = true when fetched live this session, false for bundled snapshot), `Range` (`1M | 6M | 1Y | 5Y`)
- `static/registry.ts` + `static/*.json` — bundled REAL historical price snapshots, keyed `${SYMBOL}_${RANGE}`
- `fetchChart.ts` — `getChart(symbol, range)` tries `/api/chart` proxy first, falls back to static; `staticChart()` is the infallible path
- `scripts/fetch-real-data.mts` (`npm run gen:data`) — fetches real history from Yahoo Finance (US tickers as-is, `.NS` for India, `-USD` for crypto) into the bundled JSON. Candle granularity is per range (`RANGE_INTERVAL` in `types.ts`: 5m for 1M, 1h for 6M/1Y, 1d for 5Y) so every timeframe builds a track of at least 5 km. No data is ever synthesized.
- `sparkline.ts` — `sparkAllRanges(symbol)` for the picker preview thumbnails

### API routes (`app/api/`)

- `chart/route.ts` — proxies CoinGecko (crypto, free) and a Twelve-Data-style adapter (equities, needs `STOCK_API_KEY`). Returns bundled static data with `200` on any upstream failure — client never breaks.
- `leaderboard/route.ts` — Neon Postgres leaderboard (needs `DATABASE_URL`). `GET ?symbol=&range=` → top 10; `POST` → insert run + return rank + refreshed top 10. Schema is created lazily via `ensureSchema` in `lib/db.ts`. Without `DATABASE_URL` (or on any DB error) responds `200` with `{ enabled: false }` — the game never depends on the DB. Name is optional; blank submits as `Anonymous`. Client helpers + types live in `lib/leaderboard.ts`.

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
