# Chart Climber 🏍️

A Hill-Climb-Racing-style bike game where the terrain **is** a stock / crypto price chart.
Green days are climbs, red days are drops. Catch air on crashes, collect coins on the
peaks, don't smash the rider's head.

Built with **Next.js (App Router) + TypeScript**, **Matter.js** (physics only — rendering is
hand-written **Canvas 2D**), **Tailwind** for UI chrome, and **Zustand** for state.

## Run it (zero config)

```bash
npm install
npm run dev
```

Open http://localhost:3000, pick a mountain (asset + range), ride.

- **No API keys, no env vars required.** The game ships with bundled, seeded **illustrative**
  price series (clearly labelled — these are *not* real historical prices).
- Controls: `→ / D / ↑` gas, `← / A / ↓` brake. Touch devices get on-screen buttons.

## Optional live data

`GET /api/chart?symbol=BTC&range=1Y` proxies **CoinGecko** for crypto (free, no key) and
returns daily-normalized data with `illustrative: false`. Equities use a
[Twelve Data](https://twelvedata.com)-style adapter behind `STOCK_API_KEY`. If a key is
missing or any upstream call fails, the route returns the bundled static series with a `200`,
so the client never breaks.

```bash
STOCK_API_KEY=your_key npm run dev   # enables live equities too
```

## Regenerate bundled data

```bash
npm run gen:data   # rewrites lib/data/static/*.json + registry.ts (seeded, deterministic)
```

## Assets

US: AAPL, TSLA, NVDA · India: RELIANCE, TCS, INFY · Crypto: BTC, ETH

## Layout

```
app/        routes: picker (/), game (/game/[symbol]), live proxy (/api/chart)
lib/data/   types, asset catalog, seeded generator, static JSON, client fetch+fallback
lib/game/   constants, terrain, bike, camera, input, engine, renderer, loop
components/  GameCanvas, HUD, AssetPicker, GameOverModal, TouchControls, Sparkline
store/      zustand game store (best score per symbol, persisted)
```
