import { ASSETS, metaOf, type AssetProfile } from './assets';
import { RANGE_POINTS, type ChartSeries, type PricePoint, type Range } from './types';

// Deterministic seeded RNG so generated series are stable across builds.
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Stable 32-bit hash of a string -> RNG seed keyed on symbol+range.
function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Box-Muller standard normal from two uniforms.
function gaussian(rng: () => number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const TRADING_DAYS = 252;

// Geometric random walk: daily log-return = drift/day + vol/day * N(0,1),
// with occasional jump "spikes" to give crypto-like terrain. Prices stay > 0.
export function generateSeries(profile: AssetProfile, range: Range): ChartSeries {
  const n = RANGE_POINTS[range];
  const rng = mulberry32(hashSeed(`${profile.symbol}_${range}`));

  const dailyDrift = profile.annDrift / TRADING_DAYS;
  const dailyVol = profile.annVol / Math.sqrt(TRADING_DAYS);

  const points: PricePoint[] = [];
  let price = profile.start;

  // Walk backwards in calendar time from "today" so the last point is most recent.
  const dayMs = 24 * 60 * 60 * 1000;
  const now = Date.UTC(2026, 5, 14); // fixed reference date for deterministic output

  for (let i = 0; i < n; i++) {
    // Mean-reverting-ish: subtract half-variance so drift is the true trend.
    let logRet = dailyDrift - 0.5 * dailyVol * dailyVol + dailyVol * gaussian(rng);
    // Occasional spike: a fat-tailed jump scaled by the asset's spike factor.
    if (rng() < profile.spike * 0.15) {
      logRet += (rng() - 0.5) * profile.spike * 3;
    }
    price = Math.max(0.01, price * Math.exp(logRet));
    const t = now - (n - 1 - i) * dayMs;
    points.push({ t, close: Math.round(price * 100) / 100 });
  }

  return { meta: metaOf(profile), range, points, illustrative: true };
}

// Build the full catalog of series for every asset/range (used by gen:data).
export function generateAll(): ChartSeries[] {
  const out: ChartSeries[] = [];
  for (const profile of ASSETS) {
    for (const range of Object.keys(RANGE_POINTS) as Range[]) {
      out.push(generateSeries(profile, range));
    }
  }
  return out;
}
