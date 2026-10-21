import Link from 'next/link';
import { Network } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import {
  HEADER_JOIN_LABEL,
  HEADER_SIGN_IN_LABEL,
  LANDING_BRAND,
  LANDING_NAV_ITEMS,
  LANDING_NAV_LABEL,
} from '@/constants/landing';
import { ROUTES } from '@/constants/routes';
import { PRIMARY_BUTTON_CLASS } from '@/constants/ui';
import { cn } from '@/lib/utils';

export function LandingHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200/70 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href={ROUTES.home} className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-zinc-900 text-white">
            <Network className="size-5" aria-hidden />
          </span>
          <span className="text-sm font-semibold tracking-tight sm:text-base">{LANDING_BRAND}</span>
        </Link>
        <nav aria-label={LANDING_NAV_LABEL} className="hidden items-center gap-6 md:flex">
          {LANDING_NAV_ITEMS.map(({ href, label }) => (
            <a
              key={href}
              href={href}
              className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900"
            >
              {label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link href={ROUTES.login} className={buttonVariants({ variant: 'ghost', size: 'lg' })}>
            {HEADER_SIGN_IN_LABEL}
          </Link>
          <Link
            href={ROUTES.register}
            className={cn(buttonVariants({ size: 'lg' }), PRIMARY_BUTTON_CLASS)}
          >
            {HEADER_JOIN_LABEL}
          </Link>
        </div>
      </div>
    </header>
  );
}
