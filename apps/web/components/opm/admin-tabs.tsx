'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ADMIN_TABS_LABEL } from '@/constants/admin';
import { ADMIN_TABS } from '@/constants/routes';
import { cn } from '@/lib/utils';

/** The admin area's sections as real links, so each has its own URL. */
export function AdminTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label={ADMIN_TABS_LABEL} className="flex gap-1 border-b border-zinc-200">
      {ADMIN_TABS.map(({ href, label }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              '-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors',
              active
                ? 'border-zinc-900 text-zinc-900'
                : 'border-transparent text-zinc-500 hover:text-zinc-900',
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
