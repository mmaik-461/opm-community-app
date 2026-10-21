import { describe, expect, it } from 'vitest';
import { isActiveRoute, loginUrl, resolveAuthRedirect, safeCallbackUrl } from './routes';

describe('safeCallbackUrl', () => {
  it('keeps same-origin app paths, including their query', () => {
    expect(safeCallbackUrl('/directory')).toBe('/directory');
    expect(safeCallbackUrl('/intros?sentPage=2')).toBe('/intros?sentPage=2');
  });

  it.each([
    ['nothing', undefined],
    ['an empty value', ''],
    ['an absolute URL', 'https://evil.example/phish'],
    ['a protocol-relative URL', '//evil.example'],
    ['a backslash trick', '/\\evil.example'],
    ['a relative path', 'directory'],
    ['an auth page (redirect loop)', '/login'],
    ['an auth page with a query', '/register?x=1'],
    ['the landing page', '/'],
  ])('falls back to the app home for %s', (_name, raw) => {
    expect(safeCallbackUrl(raw)).toBe('/matchmaker');
  });
});

describe('loginUrl', () => {
  it('remembers where the visitor was going, but not the home page', () => {
    expect(loginUrl('/directory')).toBe('/login?callbackUrl=%2Fdirectory');
    expect(loginUrl('/matchmaker')).toBe('/login');
    expect(loginUrl('/')).toBe('/login');
    expect(loginUrl('//evil.example')).toBe('/login');
  });
});

describe('isActiveRoute', () => {
  it('matches home exactly and other items with their nested routes', () => {
    expect(isActiveRoute('/matchmaker', '/matchmaker')).toBe(true);
    expect(isActiveRoute('/directory', '/matchmaker')).toBe(false);
    expect(isActiveRoute('/directory', '/directory')).toBe(true);
    expect(isActiveRoute('/directory/x', '/directory')).toBe(true);
    expect(isActiveRoute('/directory-old', '/directory')).toBe(false);
  });
});

describe('resolveAuthRedirect', () => {
  it('sends signed-out visitors from any app page to /login with a way back', () => {
    expect(resolveAuthRedirect('/matchmaker', '', false)).toBe('/login');
    expect(resolveAuthRedirect('/intros', '?sentPage=2', false)).toBe(
      '/login?callbackUrl=%2Fintros%3FsentPage%3D2',
    );
  });

  it('lets signed-out visitors open the auth pages', () => {
    expect(resolveAuthRedirect('/login', '', false)).toBeNull();
    expect(resolveAuthRedirect('/register', '', false)).toBeNull();
  });

  it('lets signed-out visitors open the public landing page', () => {
    expect(resolveAuthRedirect('/', '', false)).toBeNull();
  });

  it('sends signed-in users from the landing page into the app', () => {
    expect(resolveAuthRedirect('/', '', true)).toBe('/matchmaker');
  });

  it('lets signed-in users through, and moves them off the auth pages', () => {
    expect(resolveAuthRedirect('/directory', '', true)).toBeNull();
    expect(resolveAuthRedirect('/login', '', true)).toBe('/matchmaker');
    expect(resolveAuthRedirect('/login', '?callbackUrl=%2Fadmin', true)).toBe('/admin');
    expect(resolveAuthRedirect('/login', '?callbackUrl=https://evil.example', true)).toBe(
      '/matchmaker',
    );
  });
});
