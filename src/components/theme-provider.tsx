'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ReactNode } from 'react';

/**
 * FR-005: follow the OS preference, allow a manual override, persist it, and
 * show **no unstyled flash** (AC-001-14).
 *
 * `next-themes` earns its place by the last clause: it injects a tiny blocking
 * script that puts `.dark` on `<html>` before the first paint. A hand-rolled
 * `useEffect` would paint light first and then correct itself, which is exactly
 * the flash the AC forbids. `attribute="class"` pairs with the
 * `@custom-variant dark` declared in `globals.css`.
 */
export function ThemeProvider({ children }: { readonly children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
