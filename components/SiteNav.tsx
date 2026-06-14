'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Play } from 'lucide-react';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';

const LINKS = [
  { href: '/#features', label: 'Features' },
  { href: '/#how', label: 'How it works' },
  { href: '/play', label: 'Assets' },
];

export function SiteNav() {
  const pathname = usePathname();
  const onPlay = pathname?.startsWith('/play');

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-canvas/80 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
        <Link href="/" className="focus-ring rounded-lg" aria-label="Chart Climber home">
          <Logo />
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-elevated hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2.5">
          <ThemeToggle />
          {!onPlay && (
            <Link
              href="/play"
              className="bg-brand-gradient focus-ring inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-brand/30 transition hover:brightness-110 active:scale-95"
            >
              <Play className="h-4 w-4 fill-current" />
              Play
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
