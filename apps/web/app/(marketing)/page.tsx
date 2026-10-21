import type { Metadata } from 'next';
import { Hero } from '@/components/opm/landing/hero';
import { LandingHeader } from '@/components/opm/landing/landing-header';
import {
  Features,
  FinalCta,
  LandingFooter,
  NetworkShowcase,
  TrustBanner,
} from '@/components/opm/landing/sections';
import { HERO_SUBTITLE, LANDING_BRAND } from '@/constants/landing';

export const metadata: Metadata = {
  title: { absolute: `${LANDING_BRAND} · Verified alumni, matched by AI` },
  description: HERO_SUBTITLE,
};

/** Public landing page: static Server Components, with only the canvas hero visual on the client. */
export default function LandingPage() {
  return (
    <>
      <LandingHeader />
      <main>
        <Hero />
        <Features />
        <NetworkShowcase />
        <TrustBanner />
        <FinalCta />
      </main>
      <LandingFooter year={new Date().getFullYear()} />
    </>
  );
}
