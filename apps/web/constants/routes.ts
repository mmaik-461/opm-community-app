export const ROUTES = {
  home: '/',
  directory: '/directory',
  intros: '/intros',
  admin: '/admin',
  adminFeedback: '/admin/feedback',
  login: '/login',
  register: '/register',
} as const;

/** Reachable without a session; signed-in users are sent on to the app. */
export const AUTH_ROUTES: readonly string[] = [ROUTES.login, ROUTES.register];

/** Where an unauthenticated visitor was headed, so sign-in can return them there. */
export const CALLBACK_URL_PARAM = 'callbackUrl';

export interface NavItem {
  href: string;
  label: string;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { href: ROUTES.home, label: 'AI Matchmaker' },
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
