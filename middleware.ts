import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Public routes
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/webhook') ||
    pathname.startsWith('/api/health') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next()
  }

  // Check session cookie
  const session = req.cookies.get('luda_session')
  if (!session || session.value !== 'authenticated') {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return NextResponse.next()
}

export const config = {
  // Include `/` explicitly — `'/((?!…).*)'` alone can miss the root path in some Next versions.
  matcher: [
    '/',
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
