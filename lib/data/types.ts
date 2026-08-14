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
  live: boolean; // true = fetched live this session; false = bundled real historical snapshot
};

export const RANGES: Range[] = ['1M', '6M', '1Y', '5Y'];

// Candle interval + target terrain point count per range. Short ranges use
// INTRADAY candles so the terrain is a full-length track no matter the timeframe —
// 22 daily points made a 1M run laughably short. Fetchers pull at RANGE_INTERVAL
// granularity and evenly downsample to RANGE_POINTS.
//
// Floor: every range must yield ≥ ~715 points so the track is at least 5 km
// (715 pts × SEGMENT_W 70 px ÷ PX_PER_METER 10 = 5.0 km).
export const RANGE_POINTS: Record<Range, number> = {
  '1M': 750, // 5-minute candles, downsampled (~5.3 km)
  '6M': 750, // 1-hour candles (~5.3 km)
  '1Y': 750, // 1-hour candles, downsampled (~5.3 km)
  '5Y': 1260, // daily candles (~8.8 km)
};

// Yahoo Finance interval token per range (used by scripts/fetch-real-data.mts).
// Yahoo allows intraday intervals only over limited lookbacks: ≤60 days for 5m/30m,
// ≤730 days for 1h — each range below stays inside its interval's window. 1M needs
// 5m candles: stocks trade ~13 half-hours/day, so 30m over 22 days maxes out ~286
// points — short of the 5 km floor; 5m yields ~1700.
export const RANGE_INTERVAL: Record<Range, string> = {
  '1M': '5m',
  '6M': '1h',
  '1Y': '1h',
  '5Y': '1d',
};

// Whether a range's candles are intraday (HUD shows time-of-day next to the date).
export const RANGE_INTRADAY: Record<Range, boolean> = {
  '1M': true,
  '6M': true,
  '1Y': true,
  '5Y': false,
};
