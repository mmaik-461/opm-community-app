import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import {
  HERO_EYEBROW,
  HERO_SUBTITLE,
  HERO_TITLE,
  JOIN_LABEL,
  SIGN_IN_LABEL,
} from '@/constants/landing';
import { ROUTES } from '@/constants/routes';
import { PRIMARY_BUTTON_CLASS } from '@/constants/ui';
import { cn } from '@/lib/utils';
import { NetworkBackground } from './network-background';

export const HERO_HEADING_ID = 'landing-hero-title';

export function Hero() {
  return (
    <section
      aria-labelledby={HERO_HEADING_ID}
      className="relative isolate overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-violet-50"
    >
      <div className="absolute inset-0 -z-10 opacity-70 [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_85%)]">
        <NetworkBackground />
      </div>
      <div className="mx-auto flex max-w-4xl flex-col items-center px-4 py-24 text-center sm:px-6 sm:py-32">
        <p className="rounded-full border border-indigo-200 bg-white/80 px-3 py-1 text-xs font-semibold tracking-wider text-indigo-700 uppercase">
          {HERO_EYEBROW}
        </p>
        <h1
          id={HERO_HEADING_ID}
          className="mt-6 text-4xl font-semibold tracking-tight text-balance text-zinc-900 sm:text-6xl"
        >
          {HERO_TITLE}
        </h1>
        <p className="mt-6 max-w-2xl text-base text-pretty text-zinc-600 sm:text-lg">
          {HERO_SUBTITLE}
        </p>
        <div className="mt-10 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row">
          <Link
            href={ROUTES.register}
            className={cn(
              buttonVariants({ size: 'lg' }),
              PRIMARY_BUTTON_CLASS,
              'group h-11 w-full px-5 text-base shadow-lg shadow-indigo-500/20 hover:-translate-y-0.5 sm:w-auto',
            )}
          >
            {JOIN_LABEL}
            <ArrowRight
              className="size-4 transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </Link>
          <Link
            href={ROUTES.login}
            className={cn(
              buttonVariants({ variant: 'outline', size: 'lg' }),
              'h-11 w-full bg-white/80 px-5 text-base hover:-translate-y-0.5 sm:w-auto',
            )}
          >
            {SIGN_IN_LABEL}
          </Link>
        </div>
      </div>
    </section>
  );
}
