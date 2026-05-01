/** Cookie name for the logged-in client (value is the client UUID). Edge-safe for middleware. */

export const CLIENT_SESSION_COOKIE = 'luda_session'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isClientSessionCookie(value: string | undefined | null): boolean {
  if (!value) return false
  return UUID_RE.test(value)
}
