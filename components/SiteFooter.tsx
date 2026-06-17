import Link from 'next/link';
import { Logo } from './Logo';

export function SiteFooter() {
  return (
    <footer className="border-t border-border/70">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-4 px-5 py-10 text-center sm:px-8">
        <Logo />
        <p className="max-w-md text-sm text-muted-foreground">
          A playable take on market data. Bundled charts are real historical price snapshots; crypto
          can optionally stream live prices.
        </p>
        <div className="flex items-center gap-5 text-sm text-muted-foreground">
          <Link href="/play" className="transition hover:text-foreground">
            Assets
          </Link>
          <Link href="/#features" className="transition hover:text-foreground">
            Features
          </Link>
          <Link href="/#how" className="transition hover:text-foreground">
            How it works
          </Link>
        </div>
        <p className="text-xs text-muted-foreground/70">
          © {new Date().getFullYear()} Chart Climber · Illustrative data, not financial advice
        </p>
      </div>
    </footer>
  );
}
