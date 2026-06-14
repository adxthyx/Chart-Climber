import { STATIC_SERIES } from './static/registry';
import type { ChartSeries, Range } from './types';

// Bundled illustrative series — always available, never fails.
export function staticChart(symbol: string, range: Range): ChartSeries {
  const key = `${symbol}_${range}`;
  const series = STATIC_SERIES[key];
  if (!series) {
    throw new Error(`No bundled series for ${key}`);
  }
  return series;
}

// Client fetch: try the live proxy, fall back to bundled static data.
// Always resolves to a usable ChartSeries.
export async function getChart(symbol: string, range: Range): Promise<ChartSeries> {
  try {
    const res = await fetch(`/api/chart?symbol=${encodeURIComponent(symbol)}&range=${range}`, {
      cache: 'no-store',
    });
    if (res.ok) {
      const data = (await res.json()) as ChartSeries;
      if (data?.points?.length) return data;
    }
  } catch {
    // ignore — fall through to static
  }
  return staticChart(symbol, range);
}
