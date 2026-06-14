import type { AssetClass, AssetMeta } from './types';

// Per-asset price-walk character. annDrift/annVol are annualized geometric
// random-walk parameters; start is the price at the left edge of the series.
// These are illustrative shapes, NOT real market figures.
export type AssetProfile = AssetMeta & {
  start: number; // starting price
  annDrift: number; // annual drift (e.g. 0.35 = +35%/yr trend)
  annVol: number; // annual volatility (e.g. 0.6 = high)
  spike: number; // 0..1 chance modifier for occasional jumps (crypto-ish)
};

export const ASSETS: AssetProfile[] = [
  // US equities
  {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    class: 'us',
    currency: 'USD',
    accent: '#7dd3fc',
    start: 150,
    annDrift: 0.18,
    annVol: 0.28,
    spike: 0.04,
  },
  {
    symbol: 'TSLA',
    name: 'Tesla, Inc.',
    class: 'us',
    currency: 'USD',
    accent: '#f87171',
    start: 210,
    annDrift: 0.22,
    annVol: 0.6,
    spike: 0.12,
  },
  {
    symbol: 'NVDA',
    name: 'NVIDIA Corp.',
    class: 'us',
    currency: 'USD',
    accent: '#86efac',
    start: 130,
    annDrift: 0.7,
    annVol: 0.5,
    spike: 0.1,
  },
  // India equities (INR)
  {
    symbol: 'RELIANCE',
    name: 'Reliance Industries',
    class: 'india',
    currency: 'INR',
    accent: '#fcd34d',
    start: 2400,
    annDrift: 0.14,
    annVol: 0.26,
    spike: 0.04,
  },
  {
    symbol: 'TCS',
    name: 'Tata Consultancy Services',
    class: 'india',
    currency: 'INR',
    accent: '#c4b5fd',
    start: 3500,
    annDrift: 0.12,
    annVol: 0.22,
    spike: 0.03,
  },
  {
    symbol: 'INFY',
    name: 'Infosys Ltd.',
    class: 'india',
    currency: 'INR',
    accent: '#67e8f9',
    start: 1500,
    annDrift: 0.1,
    annVol: 0.24,
    spike: 0.03,
  },
  // Crypto (USD)
  {
    symbol: 'BTC',
    name: 'Bitcoin',
    class: 'crypto',
    currency: 'USD',
    accent: '#fb923c',
    start: 38000,
    annDrift: 0.4,
    annVol: 0.85,
    spike: 0.18,
  },
  {
    symbol: 'ETH',
    name: 'Ethereum',
    class: 'crypto',
    currency: 'USD',
    accent: '#a5b4fc',
    start: 2200,
    annDrift: 0.35,
    annVol: 0.95,
    spike: 0.2,
  },
];

export const ASSET_BY_SYMBOL: Record<string, AssetProfile> = Object.fromEntries(
  ASSETS.map((a) => [a.symbol, a]),
);

export const CLASS_LABEL: Record<AssetClass, string> = {
  us: 'US Stocks',
  india: 'India Stocks',
  crypto: 'Crypto',
};

// CoinGecko ids for the live proxy (crypto only).
export const COINGECKO_ID: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
};

export function metaOf(p: AssetProfile): AssetMeta {
  return {
    symbol: p.symbol,
    name: p.name,
    class: p.class,
    currency: p.currency,
    accent: p.accent,
  };
}
