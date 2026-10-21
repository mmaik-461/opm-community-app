import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import { resetMockAuth } from './next-auth';
import { resetMockNavigation } from './next-navigation';

// NextAuth's browser client is an external boundary (it talks to /api/auth/*); see test/next-auth.ts.
vi.mock('next-auth/react', () => import('./next-auth'));
// So is the App Router: components navigate through it, tests assert where they were sent.
vi.mock('next/navigation', () => import('./next-navigation'));

afterEach(() => {
  cleanup();
  resetMockAuth();
  resetMockNavigation();
});

// Specs that opt into `@vitest-environment node` (server-only code) have no DOM to patch.
if (typeof Element !== 'undefined') {
  // Radix primitives rely on these browser APIs, which jsdom does not implement.
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.scrollIntoView ??= () => {};
}
