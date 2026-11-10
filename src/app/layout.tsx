import type { Metadata } from 'next';
import { Geist } from 'next/font/google';

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
 * Root layout. Deliberately a document shell only — `<html lang="en">`, a
 * `<title>` via `metadata`, and the font variable. The UI-01 application shell
 * (sidebar, navigation, dark-mode toggle) is feature 001, not 000.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={geistSans.variable}>
      <body>{children}</body>
    </html>
  );
}
