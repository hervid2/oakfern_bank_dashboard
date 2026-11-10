'use client';

import { MonitorIcon, MoonIcon, SunIcon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useSyncExternalStore } from 'react';

import { Button } from '@/components/ui/button';

/**
 * Light → dark → system → light (FR-005). The icon changes with the state and
 * the accessible name names the **next** state, so the control is never
 * colour-only and never ambiguous (`ui-system` rule 11).
 *
 * The `mounted` guard is not ceremony: the stored choice lives in
 * `localStorage`, which the server cannot see, so rendering the resolved icon
 * before hydration would be a guaranteed mismatch. The button keeps its box from
 * the first paint, so nothing shifts when the icon arrives.
 */

const ORDER = ['light', 'dark', 'system'] as const;
type ThemeChoice = (typeof ORDER)[number];

const ICONS = { light: SunIcon, dark: MoonIcon, system: MonitorIcon } as const;

const asChoice = (value: string | undefined): ThemeChoice =>
  value === 'light' || value === 'dark' ? value : 'system';

/**
 * "Has this component hydrated?" — the server snapshot is `false`, the client
 * snapshot is `true`, and nothing ever changes, so there is no subscription.
 * This is the React 19 shape of the old `useEffect(() => setMounted(true))`,
 * which `react-hooks/set-state-in-effect` now rejects as a lint error.
 */
const subscribe = (): (() => void) => () => undefined;
const useHydrated = (): boolean =>
  useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useHydrated();

  const current = asChoice(theme);
  const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];
  const Icon = ICONS[current];

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={mounted ? `Switch to ${next} theme` : 'Switch theme'}
      onClick={() => {
        setTheme(next);
      }}
    >
      {mounted ? <Icon aria-hidden /> : <span aria-hidden className="size-4" />}
    </Button>
  );
}
