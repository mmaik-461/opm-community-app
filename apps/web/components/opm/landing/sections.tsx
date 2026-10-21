import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { SIGN_IN_TAB, SIGN_UP_TAB } from '@/constants/auth';
import {
  CTA_SUBTITLE,
  CTA_TITLE,
  FEATURES_SUBTITLE,
  FEATURES_TITLE,
  FOOTER_COPYRIGHT_OWNER,
  FOOTER_LINKS,
  FOOTER_NAV_LABEL,
  FOOTER_RIGHTS,
  JOIN_LABEL,
  LANDING_SECTION_IDS,
  NETWORK_GROUPS,
  NETWORK_SUBTITLE,
  NETWORK_TITLE,
  PILLARS,
  SIGN_IN_LABEL,
  TRUST_POINTS,
  TRUST_TITLE,
} from '@/constants/landing';
import { ROUTES } from '@/constants/routes';
import { PRIMARY_BUTTON_CLASS } from '@/constants/ui';
import { cn } from '@/lib/utils';

const SECTION_CLASS = 'mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6';

function SectionHeading({ id, title, subtitle }: { id: string; title: string; subtitle?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <h2 id={id} className="text-3xl font-semibold tracking-tight text-balance">
        {title}
      </h2>
      {subtitle && <p className="mt-3 text-zinc-600">{subtitle}</p>}
    </div>
  );
}

export function Features() {
  return (
    <section
      id={LANDING_SECTION_IDS.features}
      aria-labelledby="features-title"
      className={SECTION_CLASS}
    >
      <SectionHeading id="features-title" title={FEATURES_TITLE} subtitle={FEATURES_SUBTITLE} />
      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {PILLARS.map(({ icon: Icon, title, description }) => (
          <article
            key={title}
            className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-md"
          >
            <span className="flex size-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <Icon className="size-5" aria-hidden />
            </span>
            <h3 className="mt-5 text-lg font-semibold tracking-tight">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600">{description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function NetworkShowcase() {
  return (
    <section
      id={LANDING_SECTION_IDS.network}
      aria-labelledby="network-title"
      className="scroll-mt-20 bg-zinc-100/60"
    >
      <div className={cn(SECTION_CLASS, 'scroll-mt-0')}>
        <SectionHeading id="network-title" title={NETWORK_TITLE} subtitle={NETWORK_SUBTITLE} />
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {NETWORK_GROUPS.map(({ title, tags }) => (
            <div key={title} className="rounded-2xl border border-zinc-200 bg-white p-6">
              <h3 className="text-xs font-semibold tracking-wider text-zinc-500 uppercase">
                {title}
              </h3>
              <ul className="mt-4 flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <li key={tag}>
                    <Badge
                      variant="secondary"
                      className="h-7 px-3 text-sm transition-colors hover:bg-indigo-50 hover:text-indigo-700"
                    >
                      {tag}
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function TrustBanner() {
  return (
    <section
      id={LANDING_SECTION_IDS.trust}
      aria-labelledby="trust-title"
      className="scroll-mt-20 bg-zinc-900 text-white"
    >
      <div className={cn(SECTION_CLASS, 'scroll-mt-0')}>
        <h2 id="trust-title" className="text-center text-3xl font-semibold tracking-tight">
          {TRUST_TITLE}
        </h2>
        <dl className="mt-12 grid gap-8 md:grid-cols-3">
          {TRUST_POINTS.map(({ title, description }) => (
            <div key={title} className="border-t border-white/20 pt-5">
              <dt className="text-lg font-semibold">{title}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-zinc-300">{description}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section aria-labelledby="cta-title" className={cn(SECTION_CLASS, 'text-center')}>
      <h2 id="cta-title" className="text-3xl font-semibold tracking-tight text-balance">
        {CTA_TITLE}
      </h2>
      <p className="mt-3 text-zinc-600">{CTA_SUBTITLE}</p>
      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link
          href={ROUTES.register}
          className={cn(buttonVariants({ size: 'lg' }), PRIMARY_BUTTON_CLASS, 'h-11 px-5')}
        >
          {JOIN_LABEL}
        </Link>
        <Link
          href={ROUTES.login}
          className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'h-11 px-5')}
        >
          {SIGN_IN_LABEL}
        </Link>
      </div>
    </section>
  );
}

export function LandingFooter({ year }: { year: number }) {
  return (
    <footer className="border-t border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-zinc-500 sm:flex-row sm:px-6">
        <p>
          © {year} {FOOTER_COPYRIGHT_OWNER}. {FOOTER_RIGHTS}
        </p>
        <nav aria-label={FOOTER_NAV_LABEL} className="flex items-center gap-5">
          {FOOTER_LINKS.map(({ href, label }) => (
            <a key={href} href={href} className="transition-colors hover:text-zinc-900">
              {label}
            </a>
          ))}
          <Link href={ROUTES.login} className="transition-colors hover:text-zinc-900">
            {SIGN_IN_TAB}
          </Link>
          <Link href={ROUTES.register} className="transition-colors hover:text-zinc-900">
            {SIGN_UP_TAB}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
