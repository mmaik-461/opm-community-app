import { Handshake, ShieldCheck, Sparkles, type LucideIcon } from 'lucide-react';

export const LANDING_BRAND = 'OPM Community Hub';

export const LANDING_NAV_LABEL = 'Landing sections';
export const LANDING_SECTION_IDS = {
  features: 'features',
  network: 'network',
  trust: 'trust',
} as const;

export const LANDING_NAV_ITEMS = [
  { href: `#${LANDING_SECTION_IDS.features}`, label: 'Features' },
  { href: `#${LANDING_SECTION_IDS.network}`, label: 'The network' },
  { href: `#${LANDING_SECTION_IDS.trust}`, label: 'Trust' },
] as const;

export const HERO_EYEBROW = 'AI-driven · Verified · Alumni-only';
export const HERO_TITLE = 'Find the right alumni, instantly.';
export const HERO_SUBTITLE =
  'A verified community connecting leaders, founders and specialists. Describe who you need in plain language and our AI matchmaker finds them.';
export const JOIN_LABEL = 'Join the Network';
export const SIGN_IN_LABEL = 'Sign In';
export const HERO_VISUAL_LABEL = 'Animated graph of connected alumni';

export interface Pillar {
  icon: LucideIcon;
  title: string;
  description: string;
}

export const FEATURES_TITLE = 'Built for meaningful connections';
export const FEATURES_SUBTITLE = 'Three principles keep every introduction relevant and trusted.';
export const PILLARS: readonly Pillar[] = [
  {
    icon: Sparkles,
    title: 'Smart Semantic Matchmaking',
    description:
      'Ask in natural language. AI embeddings and pgvector similarity search surface the alumni whose experience truly fits, with a tailored icebreaker.',
  },
  {
    icon: ShieldCheck,
    title: 'Verified Alumni Only',
    description:
      'Every registration is reviewed by an administrator against graduation credentials, so the circle stays small, real and high-trust.',
  },
  {
    icon: Handshake,
    title: 'Double-Opt-In Introductions',
    description:
      'Connection requests reach a member only when they accept. No cold outreach, no spam, and the conversation continues on your own channel.',
  },
];

export const NETWORK_TITLE = 'Who is in the network';
export const NETWORK_SUBTITLE =
  'Alumni from many cohorts and walks of life, united by the same programme.';

export interface NetworkGroup {
  title: string;
  tags: readonly string[];
}

export const NETWORK_GROUPS: readonly NetworkGroup[] = [
  {
    title: 'Cohorts',
    tags: ['Class of 2012', 'Class of 2016', 'Class of 2019', 'Class of 2022'],
  },
  {
    title: 'Leadership roles',
    tags: ['Founders', 'C-level executives', 'Investors', 'Engineering leads', 'Product directors'],
  },
  {
    title: 'Industries',
    tags: ['Fintech', 'HealthTech', 'AI & Data', 'Consulting', 'Climate', 'E-commerce'],
  },
];

export interface TrustPoint {
  title: string;
  description: string;
}

export const TRUST_TITLE = 'Trust is the product';
export const TRUST_POINTS: readonly TrustPoint[] = [
  {
    title: 'Privacy by design',
    description:
      'Diploma numbers stay private and visible only to reviewing admins. We never expose your contact details without your consent.',
  },
  {
    title: 'Verified credentials',
    description:
      'Only reviewed alumni can search, match and request introductions. Everyone you meet has been checked.',
  },
  {
    title: 'Real career impact',
    description:
      'Warm, relevant introductions that lead to hires, partnerships, mentors and investors, not another feed to scroll.',
  },
];

export const CTA_TITLE = 'Ready to meet your next collaborator?';
export const CTA_SUBTITLE = 'Create your account, get verified and start matching in minutes.';

export const FOOTER_NAV_LABEL = 'Footer';
export const FOOTER_LINKS = [
  { href: `#${LANDING_SECTION_IDS.features}`, label: 'Features' },
  { href: `#${LANDING_SECTION_IDS.network}`, label: 'The network' },
  { href: `#${LANDING_SECTION_IDS.trust}`, label: 'Trust' },
] as const;

export const FOOTER_COPYRIGHT_OWNER = 'OPM Alumni Community';

export const NETWORK_GRAPH = {
  nodeCount: 46,
  /** Nodes closer than this (fraction of the shorter canvas side) are linked. */
  linkDistance: 0.2,
  /** Peak drift speed per frame, in canvas fractions. */
  speed: 0.0004,
  nodeRadius: 2.4,
  /** Nodes per px² of canvas, so small screens stay light. */
  nodesPerPixel: 1e-4,
} as const;

export const HEADER_SIGN_IN_LABEL = 'Log in';
export const HEADER_JOIN_LABEL = 'Join';
export const FOOTER_RIGHTS = 'All rights reserved.';
