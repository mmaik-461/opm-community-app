import { getToken } from 'next-auth/jwt';
import { NextResponse, type NextRequest } from 'next/server';
import { resolveAuthRedirect } from '@/utils/routes';

/** Runs before every page: guests may see the landing page and sign-in pages, signed-in users skip them. */
export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.AUTH_SECRET });
  const { pathname, search } = req.nextUrl;
  const target = resolveAuthRedirect(pathname, search, Boolean(token?.sub));
  return target ? NextResponse.redirect(new URL(target, req.url)) : NextResponse.next();
}

export const config = {
  // Everything except the NextAuth API, Next internals and static files (anything with an extension).
  matcher: ['/((?!api|_next/static|_next/image|.*\\..*).*)'],
};
