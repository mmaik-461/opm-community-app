export const ROUTES = {
  home: '/',
  matchmaker: '/matchmaker',
  directory: '/directory',
  intros: '/intros',
  admin: '/admin',
  adminFeedback: '/admin/feedback',
  login: '/login',
  register: '/register',
} as const;

/** Where signed-in users land: after signing in, and when they open the public landing page. */
export const APP_HOME = ROUTES.matchmaker;

/** Reachable without a session; signed-in users are sent on to the app. */
export const AUTH_ROUTES: readonly string[] = [ROUTES.login, ROUTES.register];

/** The marketing landing page: open to guests, signed-in users are sent into the app. */
export const LANDING_ROUTES: readonly string[] = [ROUTES.home];

/** Where an unauthenticated visitor was headed, so sign-in can return them there. */
export const CALLBACK_URL_PARAM = 'callbackUrl';

export interface NavItem {
  href: string;
  label: string;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { href: ROUTES.matchmaker, label: 'AI Matchmaker' },
  { href: ROUTES.directory, label: 'Alumni Directory' },
  { href: ROUTES.intros, label: 'My Intros' },
];

/** Only offered to admins; the API enforces the role regardless. */
export const ADMIN_NAV_ITEM: NavItem = { href: ROUTES.admin, label: 'Verifications' };

/** Sections of the admin area, shown as links above its pages. */
export const ADMIN_TABS: readonly NavItem[] = [
  ADMIN_NAV_ITEM,
  { href: ROUTES.adminFeedback, label: 'Feedback Analytics' },
];
