'use client';

import { MenuIcon } from 'lucide-react';
import { useState } from 'react';

import { Wordmark } from '@/components/brand/wordmark';
import { SidebarNav } from '@/components/shell/app-sidebar';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

/**
 * Below 1024 px the navigation lives behind the topbar menu button and opens as
 * a dismissible sheet (FR-006, AC-001-15). Radix traps focus and closes on
 * `Esc`; the open state is held here only so that following a link closes it —
 * otherwise the sheet would stay over the page it just navigated to.
 */
export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Open navigation" className="lg:hidden">
          <MenuIcon aria-hidden />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 bg-background">
        <SheetHeader>
          <SheetTitle className="font-normal">
            <Wordmark size="sm" />
          </SheetTitle>
          <SheetDescription className="sr-only">Oakfern navigation</SheetDescription>
        </SheetHeader>
        <SidebarNav
          onNavigate={() => {
            setOpen(false);
          }}
        />
      </SheetContent>
    </Sheet>
  );
}
