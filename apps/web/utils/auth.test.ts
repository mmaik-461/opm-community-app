import { afterEach, describe, expect, it, vi } from 'vitest';
import { bearerHeader, isDevLoginEnabled } from './auth';

afterEach(() => vi.unstubAllEnvs());

describe('isDevLoginEnabled', () => {
  it.each([
    ['development', undefined, true],
    ['test', undefined, true],
    ['production', undefined, false],
    ['production', 'false', false],
    ['production', 'true', true],
  ])('NODE_ENV=%s NEXT_PUBLIC_AUTH_DEV_LOGIN=%s -> %s', (nodeEnv, flag, enabled) => {
    vi.stubEnv('NODE_ENV', nodeEnv);
    vi.stubEnv('NEXT_PUBLIC_AUTH_DEV_LOGIN', flag ?? '');
    expect(isDevLoginEnabled()).toBe(enabled);
  });
});

describe('bearerHeader', () => {
  it('formats an Authorization header value', () => {
    expect(bearerHeader('abc.def')).toBe('Bearer abc.def');
  });
});
