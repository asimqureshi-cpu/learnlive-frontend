import { NextResponse } from 'next/server';

const PUBLIC_ROUTES = ['/login', '/reset-password'];

export async function middleware(req) {
  const path = req.nextUrl.pathname;
  
  console.log('[Middleware] Running for path:', path);

  // Allow public routes
  if (PUBLIC_ROUTES.some(r => path.startsWith(r))) {
    console.log('[Middleware] Public route, allowing');
    return NextResponse.next();
  }

  // Check for any Supabase auth cookie
  const cookies = req.cookies.getAll();
  const authCookie = cookies.find(c => 
    c.name.startsWith('sb-') && c.name.endsWith('-auth-token')
  );

  console.log('[Middleware] Auth cookie found:', !!authCookie);

  if (!authCookie) {
    console.log('[Middleware] No auth cookie, redirecting to login');
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('redirect', path);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|_next/data).*)'],
};
