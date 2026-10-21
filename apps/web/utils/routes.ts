import {
  APP_HOME,
  AUTH_ROUTES,
  CALLBACK_URL_PARAM,
  LANDING_ROUTES,
  ROUTES,
} from '@/constants/routes';

const PLACEHOLDER_ORIGIN = 'http://localhost';

/** Only same-origin app paths are honoured, so `?callbackUrl=` can never become an open redirect. */
export function safeCallbackUrl(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) return APP_HOME;
  const url = new URL(raw, PLACEHOLDER_ORIGIN);
  if (url.origin !== PLACEHOLDER_ORIGIN || AUTH_ROUTES.includes(url.pathname)) return APP_HOME;
  if (LANDING_ROUTES.includes(url.pathname)) return APP_HOME;
  return `${url.pathname}${url.search}`;
}

export function withCallbackUrl(path: string, callbackUrl: string | null | undefined): string {
  const target = safeCallbackUrl(callbackUrl);
  return target === APP_HOME ? path : `${path}?${CALLBACK_URL_PARAM}=${encodeURIComponent(target)}`;
}

/** The login page that returns the visitor to `target` after signing in. */
export const loginUrl = (target: string): string => withCallbackUrl(ROUTES.login, target);

/** An item is active on its own route and on the routes nested under it. */
export function isActiveRoute(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Where a request must be redirected given its session, or null when it may proceed. */
export function resolveAuthRedirect(
  pathname: string,
  search: string,
  authenticated: boolean,
): string | null {
  const onAuthPage = AUTH_ROUTES.includes(pathname);
  if (authenticated) {
    if (LANDING_ROUTES.includes(pathname)) return APP_HOME;
    return onAuthPage ? safeCallbackUrl(new URLSearchParams(search).get(CALLBACK_URL_PARAM)) : null;
  }
  return onAuthPage || LANDING_ROUTES.includes(pathname) ? null : loginUrl(`${pathname}${search}`);
}
