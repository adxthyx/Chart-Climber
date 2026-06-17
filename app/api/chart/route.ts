import { NextResponse } from 'next/server';
import { ASSET_BY_SYMBOL, COINGECKO_ID, metaOf } from '@/lib/data/assets';
import { staticChart } from '@/lib/data/fetchChart';
import { RANGE_POINTS, RANGES, type ChartSeries, type PricePoint, type Range } from '@/lib/data/types';

// Cache successful upstream responses for an hour.
export const revalidate = 3600;

const DAYS: Record<Range, number> = { '1M': 30, '6M': 182, '1Y': 365, '5Y': 1825 };

// Evenly downsample to the target daily point count for a range.
function downsample(points: PricePoint[], range: Range): PricePoint[] {
  const target = RANGE_POINTS[range];
  if (points.length <= target) return points;
  const out: PricePoint[] = [];
  const step = (points.length - 1) / (target - 1);
  for (let i = 0; i < target; i++) out.push(points[Math.round(i * step)]);
  return out;
}

async function fetchCrypto(symbol: string, range: Range): Promise<PricePoint[]> {
  const id = COINGECKO_ID[symbol];
  const url = `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=${DAYS[range]}&interval=daily`;
  const res = await fetch(url, { next: { revalidate }, headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`coingecko ${res.status}`);
  const json = (await res.json()) as { prices?: [number, number][] };
  if (!json.prices?.length) throw new Error('coingecko empty');
  return json.prices.map(([t, close]) => ({ t, close: Math.round(close * 100) / 100 }));
}

// Twelve Data adapter for equities. Only runs when STOCK_API_KEY is set.
async function fetchEquity(symbol: string, range: Range, isIndia: boolean): Promise<PricePoint[]> {
  const key = process.env.STOCK_API_KEY;
  if (!key) throw new Error('no STOCK_API_KEY');
  const tdSymbol = isIndia ? `${symbol}:NSE` : symbol;
  const url =
    `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(tdSymbol)}` +
    `&interval=1day&outputsize=${RANGE_POINTS[range]}&order=ASC&apikey=${key}`;
  const res = await fetch(url, { next: { revalidate } });
  if (!res.ok) throw new Error(`twelvedata ${res.status}`);
  const json = (await res.json()) as {
    status?: string;
    values?: { datetime: string; close: string }[];
  };
  if (json.status === 'error' || !json.values?.length) throw new Error('twelvedata error');
  return json.values.map((v) => ({
    t: new Date(v.datetime).getTime(),
    close: Math.round(parseFloat(v.close) * 100) / 100,
  }));
}

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol') ?? '';
  const rawRange = searchParams.get('range') ?? '1Y';
  const range: Range = RANGES.includes(rawRange as Range) ? (rawRange as Range) : '1Y';

  const profile = ASSET_BY_SYMBOL[symbol];
  if (!profile) {
    return NextResponse.json({ error: 'unknown symbol' }, { status: 404 });
  }

  // Try live data; fall back to the bundled static series on ANY failure so the
  // client never breaks (200 either way).
  try {
    let points: PricePoint[];
    if (profile.class === 'crypto') {
      points = downsample(await fetchCrypto(symbol, range), range);
    } else {
      points = await fetchEquity(symbol, range, profile.class === 'india');
    }
    if (points.length < 5) throw new Error('too few points');
    const series: ChartSeries = { meta: metaOf(profile), range, points, live: true };
    return NextResponse.json(series);
  } catch {
    return NextResponse.json(staticChart(symbol, range));
  }
}
