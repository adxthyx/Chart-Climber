// Normalized data contract shared by static generation, the live proxy, and the game.

export type PricePoint = { t: number; close: number }; // t = ms epoch

export type Range = '1M' | '6M' | '1Y' | '5Y';

export type AssetClass = 'us' | 'india' | 'crypto';

export type AssetMeta = {
  symbol: string; // 'AAPL', 'RELIANCE', 'BTC'
  name: string; // 'Apple Inc.'
  class: AssetClass;
  currency: 'USD' | 'INR';
  accent: string; // hex, used for chart fill
};

export type ChartSeries = {
  meta: AssetMeta;
  range: Range;
  points: PricePoint[];
  illustrative: boolean; // true for bundled synthetic data, false for live
};

export const RANGES: Range[] = ['1M', '6M', '1Y', '5Y'];

// Daily point counts per range (approx trading days).
export const RANGE_POINTS: Record<Range, number> = {
  '1M': 22,
  '6M': 130,
  '1Y': 252,
  '5Y': 1260,
};
