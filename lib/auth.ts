import { cookies } from 'next/headers'

const SESSION_COOKIE = 'luda_session'
const SESSION_VALUE = 'authenticated'

export function isAuthenticated(): boolean {
  const cookieStore = cookies()
  return cookieStore.get(SESSION_COOKIE)?.value === SESSION_VALUE
}

export function setAuthCookie(res: Response): void {
  res.headers.set(
    'Set-Cookie',
    `${SESSION_COOKIE}=${SESSION_VALUE}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`
  )
}
