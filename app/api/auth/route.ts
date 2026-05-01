import { NextRequest, NextResponse } from 'next/server'
import { CLIENT_SESSION_COOKIE } from '@/lib/client-session'
import { getClientByPassword } from '@/lib/clients'

export async function POST(req: NextRequest) {
  const { password } = (await req.json()) as { password?: string }

  if (typeof password !== 'string' || !password) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let client
  try {
    client = await getClientByPassword(password)
  } catch (e) {
    console.error('[api/auth] getClientByPassword failed', e)
    return NextResponse.json(
      { error: 'Could not verify login. Check Supabase URL and service role key.' },
      { status: 503 }
    )
  }

  if (!client) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set(CLIENT_SESSION_COOKIE, client.id, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
    secure: process.env.NODE_ENV === 'production',
  })
  return res
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.delete(CLIENT_SESSION_COOKIE)
  return res
}
