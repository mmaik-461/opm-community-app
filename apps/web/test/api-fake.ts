import { vi } from 'vitest';

export type Handler = (req: {
  url: URL;
  method: string;
  body: unknown;
  headers: Headers;
}) => unknown;

/**
 * Stubs global fetch with a router keyed by "METHOD /path". Components run their real
 * lib/api client; only the network edge is replaced. Returns the recorded calls.
 */
export function stubApi(routes: Record<string, Handler | unknown>) {
  const calls: { method: string; path: string; body: unknown; headers: Headers }[] = [];
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    const method = init?.method ?? 'GET';
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    const headers = new Headers(init?.headers);
    calls.push({ method, path: url.pathname, body, headers });
    const route = routes[`${method} ${url.pathname}`];
    if (route === undefined) {
      return new Response(JSON.stringify({ message: `No stub for ${method} ${url.pathname}` }), {
        status: 404,
      });
    }
    const payload =
      typeof route === 'function' ? (route as Handler)({ url, method, body, headers }) : route;
    if (payload instanceof Response) return payload;
    return new Response(JSON.stringify(payload), { status: 200 });
  });
  vi.stubGlobal('fetch', fetchMock);
  return { calls };
}

export function jsonError(status: number, message: string): Response {
  return new Response(JSON.stringify({ message }), { status });
}
