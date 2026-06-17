import Link from 'next/link';
import {
  ArrowRight,
  Coins,
  Gauge,
  Globe,
  MountainSnow,
  Play,
  Smartphone,
  Sparkles,
  Trophy,
  Zap,
} from 'lucide-react';
import { ASSETS } from '@/lib/data/assets';
import { SiteNav } from '@/components/SiteNav';
import { SiteFooter } from '@/components/SiteFooter';
import { GameMockup } from '@/components/landing/GameMockup';

const FEATURES = [
  {
    icon: MountainSnow,
    title: 'Charts become terrain',
    body: 'Every price series is rebuilt as a rideable mountain. Rallies become climbs, sell-offs become drops — the market literally is the track.',
  },
  {
    icon: Coins,
    title: 'Score the rally',
    body: 'Grab coins on local highs, chain flips and airtime, and bank a portfolio score. Personal bests are saved per asset.',
  },
  {
    icon: Gauge,
    title: 'Real physics',
    body: 'A Matter.js bike with throttle, brake and pitch control. Suspension, momentum and crashes — it feels like a real climb.',
  },
  {
    icon: Zap,
    title: 'Zero setup',
    body: 'No accounts, no API keys, no install. Open a chart and ride instantly — bundled data works fully offline.',
  },
  {
    icon: Globe,
    title: 'Real market data',
    body: 'Ships with real historical price snapshots for every asset. Add a key and crypto streams live CoinGecko prices.',
  },
  {
    icon: Smartphone,
    title: 'Plays anywhere',
    body: 'Keyboard on desktop, on-screen gas and brake on touch. Crisp on every screen, from phone to ultrawide.',
  },
];

const STEPS = [
  {
    title: 'Pick a mountain',
    body: 'Choose from US stocks, Indian equities or crypto, and the range you want to ride — 1M to 5Y.',
  },
  {
    title: 'Ride the chart',
    body: 'Gas up the green rallies, feather the brake on red crashes, and keep your fuel and balance in check.',
  },
  {
    title: 'Beat your best',
    body: 'Stack coins, flips and distance into a portfolio score, then come back to top your own record.',
  },
];

export default function Home() {
  const chips = ASSETS.map((a) => a.symbol);

  return (
    <div className="flex min-h-full flex-col">
      <SiteNav />

      <main className="flex-1">
        {/* Hero */}
        <section className="glow-brand relative overflow-hidden">
          <div className="mx-auto w-full max-w-6xl px-5 pb-12 pt-16 text-center sm:px-8 sm:pt-24">
            <div className="animate-fade-up mx-auto flex flex-col items-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-medium text-muted-foreground shadow-sm">
                <Sparkles className="h-3.5 w-3.5 text-brand" />
                Hill-climb racing, powered by market data
              </span>

              <h1 className="mt-6 max-w-4xl text-balance text-4xl font-extrabold tracking-tight sm:text-6xl">
                Ride the markets like a{' '}
                <span className="text-gradient">mountain</span>.
              </h1>

              <p className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
                Chart Climber turns real-shaped stock and crypto charts into a physics-driven
                hill-climb game. Same data your portfolio rides — now you ride it too.
              </p>

              <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
                <Link
                  href="/play"
                  className="bg-brand-gradient focus-ring group inline-flex items-center gap-2 rounded-full px-6 py-3 text-base font-semibold text-white shadow-lg shadow-brand/30 transition hover:brightness-110 active:scale-95"
                >
                  <Play className="h-5 w-5 fill-current" />
                  Start climbing
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="/#how"
                  className="focus-ring inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-3 text-base font-semibold text-foreground transition hover:bg-elevated active:scale-95"
                >
                  How it works
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
                {chips.map((c) => (
                  <span
                    key={c}
                    className="rounded-full border border-border bg-card/60 px-3 py-1 font-mono text-xs font-medium text-muted-foreground"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>

            <div className="animate-fade-up mx-auto mt-14 max-w-4xl [animation-delay:120ms]">
              <GameMockup />
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="scroll-mt-20 border-t border-border/70">
          <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8">
            <SectionHeading
              eyebrow="How it works"
              title="From ticker to trail in three steps"
              subtitle="No tutorials, no menus to fight. Pick, ride, repeat."
            />
            <ol className="mt-12 grid gap-6 md:grid-cols-3">
              {STEPS.map((s, i) => (
                <li
                  key={s.title}
                  className="card-surface relative p-6 transition hover:-translate-y-1 hover:shadow-lg hover:shadow-black/5"
                >
                  <span className="bg-brand-gradient inline-flex h-10 w-10 items-center justify-center rounded-xl text-base font-bold text-white shadow-sm shadow-brand/30">
                    {i + 1}
                  </span>
                  <h3 className="mt-4 text-lg font-semibold tracking-tight">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="scroll-mt-20 border-t border-border/70 bg-background/40">
          <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8">
            <SectionHeading
              eyebrow="Features"
              title="Built to feel like a real game"
              subtitle="Not a chart with a gimmick — a tuned arcade racer that happens to run on market data."
            />
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <article
                  key={f.title}
                  className="card-surface group p-6 transition hover:-translate-y-1 hover:border-brand/40 hover:shadow-lg hover:shadow-black/5"
                >
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10 text-brand transition group-hover:bg-brand group-hover:text-white">
                    <f.icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-lg font-semibold tracking-tight">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-border/70">
          <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8">
            <div className="glow-brand card-surface relative overflow-hidden px-6 py-16 text-center sm:px-12">
              <span className="bg-brand-gradient mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-lg shadow-brand/30">
                <Trophy className="h-6 w-6" />
              </span>
              <h2 className="mt-6 text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">
                Your first climb is one click away
              </h2>
              <p className="mx-auto mt-4 max-w-md text-pretty text-muted-foreground">
                Eight assets, four ranges, infinite runs. Find out which chart is the hardest to
                conquer.
              </p>
              <Link
                href="/play"
                className="bg-brand-gradient focus-ring group mt-8 inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-brand/30 transition hover:brightness-110 active:scale-95"
              >
                <Play className="h-5 w-5 fill-current" />
                Play Chart Climber
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">{eyebrow}</span>
      <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
      <p className="mt-3 text-pretty text-muted-foreground">{subtitle}</p>
    </div>
  );
}
