'use client';

import { ChevronDownIcon, LogOutIcon } from 'lucide-react';

import { signOut } from '@/actions/auth';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/**
 * The signed-in identity and the only way out (AC-001-11, AC-001-13).
 *
 * `signOut` is the Server Action from `src/actions/auth.ts`: this component owns
 * no logic at all — it clears nothing, knows no cookie name and decides no
 * destination. The action does all three on the server and redirects.
 */

const initials = (name: string): string =>
  name
    .split(/\s+/)
    .filter((part) => part.length > 0)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

export function UserMenu({ userName }: { readonly userName: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2" aria-label={`Account: ${userName}`}>
          <span
            aria-hidden
            className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-[0.65rem] font-semibold text-primary"
          >
            {initials(userName)}
          </span>
          <span className="hidden sm:inline">{userName}</span>
          <ChevronDownIcon aria-hidden className="text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="font-normal">
          <span className="block text-sm font-medium text-foreground">{userName}</span>
          <span className="block text-xs text-muted-foreground">Admin · demo workspace</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            void signOut();
          }}
        >
          <LogOutIcon aria-hidden />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
