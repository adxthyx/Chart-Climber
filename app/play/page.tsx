import type { Metadata } from 'next';
import { ASSETS, metaOf } from '@/lib/data/assets';
import { sparkAllRanges } from '@/lib/data/sparkline';
import { AssetPicker, type PickerAsset } from '@/components/AssetPicker';
import { SiteNav } from '@/components/SiteNav';
import { SiteFooter } from '@/components/SiteFooter';

export const metadata: Metadata = {
  title: 'Pick an asset',
  description: 'Choose a stock or crypto chart to ride in Chart Climber.',
};

export default function PlayPage() {
  // Precompute tiny normalized sparklines on the server for every asset/range.
  const assets: PickerAsset[] = ASSETS.map((p) => ({
    meta: metaOf(p),
    spark: sparkAllRanges(p.symbol),
  }));

  return (
    <div className="flex min-h-full flex-col">
      <SiteNav />

      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-12 sm:px-8 sm:py-16">
        <header className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">
            Choose your climb
          </span>
          <h1 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            Pick a mountain
          </h1>
          <p className="mt-3 text-pretty text-muted-foreground">
            Select an asset and a range. Each chart becomes a unique, rideable trail.
          </p>
        </header>

        <div className="mt-12">
          <AssetPicker assets={assets} />
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
