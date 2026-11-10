import type { Metadata } from 'next';
import { Geist } from 'next/font/google';

import { ThemeProvider } from '@/components/theme-provider';

import './globals.css';

/**
 * Geist through `next/font` — self-hosted at build time, so there is no
 * request to an external font CDN (ADR-0002, ui-brief.md §1).
 */
const geistSans = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Oakfern',
  description: 'Banking dashboard for US startups and SMBs.',
};

/**
 * Root layout: the document shell plus the theme.
 *
 * `suppressHydrationWarning` is required and narrow: `next-themes` writes the
 * `class` and `style` of `<html>` from a blocking script before React
 * hydrates, so the server markup and the client DOM legitimately differ on
 * that one element. Without the attribute every page would log a hydration
 * warning; with it, nothing else on the page is exempt from the check.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={geistSans.variable} suppressHydrationWarning>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
