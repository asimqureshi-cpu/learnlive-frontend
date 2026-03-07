import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

const PUBLIC_ROUTES = ['/login', '/reset-password'];

export async function middleware(req) {
  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) { return req.cookies.get(name)?.value; },
        set(name, value, options) { res.cookies.set({ name, value, ...options }); },
        remove(name, options) { res.cookies.set({ name, value: '', ...options }); },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();
  const { data: { session } } = await supabase.auth.getSession();
console.log('[Middleware] path:', path, 'session:', !!session);
  const path = req.nextUrl.pathname;

  if (PUBLIC_ROUTES.some(r => path.startsWith(r))) return res;

  if (!session) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('redirect', path);
    return NextResponse.redirect(loginUrl);
  }

  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
