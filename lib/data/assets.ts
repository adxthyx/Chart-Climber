import type { AssetClass, AssetMeta } from './types';

// Asset catalog. Pure metadata — price series come from real market data only
// (live proxy or the bundled real historical snapshot in static/).
export const ASSETS: AssetMeta[] = [
  // US equities
  { symbol: 'AAPL', name: 'Apple Inc.', class: 'us', currency: 'USD', accent: '#7dd3fc' },
  { symbol: 'TSLA', name: 'Tesla, Inc.', class: 'us', currency: 'USD', accent: '#f87171' },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', class: 'us', currency: 'USD', accent: '#86efac' },
  // India equities (INR)
  { symbol: 'RELIANCE', name: 'Reliance Industries', class: 'india', currency: 'INR', accent: '#fcd34d' },
  { symbol: 'TCS', name: 'Tata Consultancy Services', class: 'india', currency: 'INR', accent: '#c4b5fd' },
  { symbol: 'INFY', name: 'Infosys Ltd.', class: 'india', currency: 'INR', accent: '#67e8f9' },
  // Crypto (USD)
  { symbol: 'BTC', name: 'Bitcoin', class: 'crypto', currency: 'USD', accent: '#fb923c' },
  { symbol: 'ETH', name: 'Ethereum', class: 'crypto', currency: 'USD', accent: '#a5b4fc' },
];

export const ASSET_BY_SYMBOL: Record<string, AssetMeta> = Object.fromEntries(
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

export function metaOf(p: AssetMeta): AssetMeta {
  return {
    symbol: p.symbol,
    name: p.name,
    class: p.class,
    currency: p.currency,
    accent: p.accent,
  };
}
