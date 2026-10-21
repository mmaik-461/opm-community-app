import { vi } from 'vitest';

let pathname = '/';
let search = '';

/** Pretends the browser is at `url`, e.g. `/login?callbackUrl=%2Fdirectory`. */
export function setMockLocation(url: string) {
  const [path, query = ''] = url.split('?');
  pathname = path;
  search = query;
}

export const router = {
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  prefetch: vi.fn(),
};

export const useRouter = () => router;
export const usePathname = () => pathname;
export const useSearchParams = () => new URLSearchParams(search);

export function resetMockNavigation() {
  setMockLocation('/');
  Object.values(router).forEach((fn) => fn.mockReset());
}
