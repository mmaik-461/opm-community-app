'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Role } from '@opm/shared-types';
import { ADMIN_NAV_ITEM, NAV_ITEMS, ROUTES } from '@/constants/routes';
import { cn } from '@/lib/utils';
import { isActiveRoute } from '@/utils/routes';
import { CountBadge } from './count-badge';
import { useIntros } from './intros-context';
import { useUser } from './user-context';
import { useVerifications } from './verifications-context';

const LINK_CLASS =
  'inline-flex h-full flex-1 items-center justify-center gap-1.5 rounded-md px-4 text-sm font-medium whitespace-nowrap text-zinc-600 transition-colors hover:text-zinc-900 focus-visible:ring-[3px] focus-visible:ring-zinc-400/50 focus-visible:outline-none';
const ACTIVE_LINK_CLASS = 'bg-white text-zinc-900 shadow-sm';

/** The app's sections as real links (history, deep links, middle-click). Rendered once per breakpoint. */
export function PrimaryNav({ className }: { className?: string }) {
  const pathname = usePathname();
  const { currentUser } = useUser();
  const { pendingIncoming } = useIntros();
  const { pending } = useVerifications();
  const items = currentUser?.role === Role.ADMIN ? [...NAV_ITEMS, ADMIN_NAV_ITEM] : [...NAV_ITEMS];
  const badgeCount: Record<string, number> = {
    [ROUTES.intros]: pendingIncoming,
    [ROUTES.admin]: pending.length,
  };

  return (
    <nav
      aria-label="Primary"
      className={cn('h-9 items-center rounded-lg bg-zinc-100 p-[3px]', className)}
    >
      {items.map(({ href, label }) => {
        const active = isActiveRoute(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(LINK_CLASS, active && ACTIVE_LINK_CLASS)}
          >
            {label}
            <CountBadge count={badgeCount[href] ?? 0} />
          </Link>
        );
      })}
    </nav>
  );
}
