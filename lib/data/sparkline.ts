import { staticChart } from './fetchChart';
import { RANGES, type Range } from './types';

// Downsample a series' closes to `n` points normalized to 0..1 (1 = highest).
// Tiny payload so the picker can ship every asset/range to the client cheaply.
export function sparkPoints(closes: number[], n = 48): number[] {
  if (closes.length <= n) return normalize(closes);
  const out: number[] = [];
  const step = (closes.length - 1) / (n - 1);
  for (let i = 0; i < n; i++) {
    out.push(closes[Math.round(i * step)]);
  }
  return normalize(out);
}

function normalize(vals: number[]): number[] {
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || 1;
  return vals.map((v) => (v - min) / span);
}

export type SparkMap = Record<string, Record<Range, number[]>>;

// Precompute normalized sparklines for every range of one asset.
export function sparkAllRanges(symbol: string): Record<Range, number[]> {
  const out = {} as Record<Range, number[]>;
  for (const r of RANGES) {
    out[r] = sparkPoints(staticChart(symbol, r).points.map((p) => p.close));
  }
  return out;
}
