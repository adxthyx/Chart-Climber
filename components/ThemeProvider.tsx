'use client';

import { ThemeProvider as NextThemes } from 'next-themes';
import type { ComponentProps } from 'react';

export function ThemeProvider({ children, ...props }: ComponentProps<typeof NextThemes>) {
  return <NextThemes {...props}>{children}</NextThemes>;
}
