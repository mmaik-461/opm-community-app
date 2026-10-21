'use client';

import Link from 'next/link';
import { Network } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { APP_HOME } from '@/constants/routes';
import { PrimaryNav } from './primary-nav';
import { UserMenu } from './user-menu';

/** Brand on the left, sections in the middle, the account menu on the right. */
export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/85 backdrop-blur dark:border-zinc-800">
      <div className="mx-auto grid min-h-16 max-w-6xl grid-cols-[1fr_auto] items-center gap-x-4 px-4 py-2 sm:px-6 lg:grid-cols-[1fr_auto_1fr]">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-white">
            <Network className="size-5" aria-hidden />
          </div>
          <h1 className="truncate text-sm font-semibold tracking-tight text-zinc-900 sm:text-base">
            <Link href={APP_HOME}>OPM Community Hub</Link>
          </h1>
          <Badge className="hidden bg-zinc-900 text-[10px] font-semibold tracking-wider text-white uppercase xl:inline-flex">
            Executive
          </Badge>
        </div>

        <PrimaryNav className="hidden lg:flex" />

        <div className="flex items-center justify-end">
          <UserMenu />
        </div>
      </div>

      {/* Section links on small screens */}
      <div className="border-t border-zinc-200 px-4 py-2 lg:hidden">
        <PrimaryNav className="flex w-full" />
      </div>
    </header>
  );
}
