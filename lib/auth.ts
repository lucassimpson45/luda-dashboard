import { cookies } from 'next/headers'
import { CLIENT_SESSION_COOKIE, isClientSessionCookie } from '@/lib/client-session'

export function isAuthenticated(): boolean {
  const cookieStore = cookies()
  const v = cookieStore.get(CLIENT_SESSION_COOKIE)?.value
  return isClientSessionCookie(v)
}

export function getClientSessionId(): string | null {
  const cookieStore = cookies()
  const v = cookieStore.get(CLIENT_SESSION_COOKIE)?.value
  return isClientSessionCookie(v) ? v! : null
}
