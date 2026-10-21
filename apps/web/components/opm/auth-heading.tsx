import Link from 'next/link';
import { ArrowLeft, Network } from 'lucide-react';
import { BACK_TO_HOME_LABEL, BRAND_HOME_LABEL } from '@/constants/auth';
import { ROUTES } from '@/constants/routes';

export function AuthHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <>
      <Link
        href={ROUTES.home}
        className="inline-flex w-fit items-center gap-1.5 text-sm text-zinc-500 transition-colors hover:text-zinc-900 focus-visible:text-zinc-900"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {BACK_TO_HOME_LABEL}
      </Link>
      <div className="flex items-center gap-3">
        <Link
          href={ROUTES.home}
          aria-label={BRAND_HOME_LABEL}
          className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-white transition-opacity hover:opacity-80"
        >
          <Network className="size-5" aria-hidden />
        </Link>
        <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
      </div>
      <p className="text-sm text-zinc-600">{subtitle}</p>
    </>
  );
}
