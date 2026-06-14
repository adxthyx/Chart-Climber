import { notFound } from 'next/navigation';
import { ASSET_BY_SYMBOL, metaOf } from '@/lib/data/assets';
import { RANGES, type Range } from '@/lib/data/types';
import { GameClient } from '@/components/GameClient';

export function generateStaticParams() {
  return Object.keys(ASSET_BY_SYMBOL).map((symbol) => ({ symbol }));
}

export default async function GamePage({
  params,
  searchParams,
}: {
  params: Promise<{ symbol: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { symbol } = await params;
  const { range: rawRange } = await searchParams;

  const profile = ASSET_BY_SYMBOL[symbol];
  if (!profile) notFound();

  const candidate = Array.isArray(rawRange) ? rawRange[0] : rawRange;
  const range: Range = RANGES.includes(candidate as Range) ? (candidate as Range) : '1Y';

  return <GameClient symbol={symbol} range={range} meta={metaOf(profile)} />;
}
