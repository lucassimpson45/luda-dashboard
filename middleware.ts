import { NextRequest, NextResponse } from 'next/server'
import { CLIENT_SESSION_COOKIE, isClientSessionCookie } from '@/lib/client-session'
const ADMIN_SESSION = 'luda_admin_session'
const ADMIN_SESSION_VALUE = 'authenticated'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/_next/image')
  ) {
    return NextResponse.next()
  }

  if (pathname.startsWith('/api/admin')) {
    return NextResponse.next()
  }

  if (pathname.startsWith('/admin/login')) {
    return NextResponse.next()
  }

  if (pathname.startsWith('/login') || pathname.startsWith('/api/auth')) {
    return NextResponse.next()
  }

  if (pathname.startsWith('/api/webhook') || pathname.startsWith('/api/health')) {
    return NextResponse.next()
  }

  if (pathname.startsWith('/admin')) {
    const admin = req.cookies.get(ADMIN_SESSION)
    if (!admin || admin.value !== ADMIN_SESSION_VALUE) {
      return NextResponse.redirect(new URL('/admin/login', req.url))
    }
    return NextResponse.next()
  }

  const session = req.cookies.get(CLIENT_SESSION_COOKIE)
  if (!session || !isClientSessionCookie(session.value)) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/((?!_next/static|_next/image|favicon.ico).*)'],
}
