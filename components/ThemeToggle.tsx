'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useSyncExternalStore } from 'react';

const noop = () => () => {};

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  // Client-only flag without an effect/setState (avoids hydration mismatch and
  // cascading-render lint). Server snapshot is always false.
  const mounted = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
  const isDark = resolvedTheme === 'dark';

  return (
    <button
      type="button"
      aria-label="Toggle color theme"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground/70 transition hover:bg-elevated hover:text-foreground active:scale-95"
    >
      {mounted && !isDark ? (
        <Sun className="h-[18px] w-[18px]" />
      ) : (
        <Moon className="h-[18px] w-[18px]" />
      )}
    </button>
  );
}
