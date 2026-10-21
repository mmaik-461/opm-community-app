import Link from 'next/link';
import { AUTH_NAV_LABEL, SIGN_IN_TAB, SIGN_UP_TAB } from '@/constants/auth';
import { ROUTES } from '@/constants/routes';
import { cn } from '@/lib/utils';
import { withCallbackUrl } from '@/utils/routes';

const LINK_CLASS =
  'flex h-full flex-1 items-center justify-center rounded-md px-3 text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900';
const ACTIVE_LINK_CLASS = 'bg-white text-zinc-900 shadow-sm';

/** Sign in / Sign up switcher; each side is its own page and keeps the post-sign-in destination. */
export function AuthNav({
  active,
  callbackUrl,
}: {
  active: 'login' | 'register';
  callbackUrl?: string;
}) {
  const items = [
    { id: 'login', href: withCallbackUrl(ROUTES.login, callbackUrl), label: SIGN_IN_TAB },
    { id: 'register', href: withCallbackUrl(ROUTES.register, callbackUrl), label: SIGN_UP_TAB },
  ] as const;
  return (
    <nav aria-label={AUTH_NAV_LABEL} className="flex h-9 rounded-lg bg-zinc-100 p-[3px]">
      {items.map(({ id, href, label }) => (
        <Link
          key={id}
          href={href}
          aria-current={id === active ? 'page' : undefined}
          className={cn(LINK_CLASS, id === active && ACTIVE_LINK_CLASS)}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
