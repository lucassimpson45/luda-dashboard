import { NextRequest, NextResponse } from 'next/server'
import { getClientSessionId } from '@/lib/auth'
import { patchQuoteFieldsInAirtable } from '@/lib/airtable'

export const dynamic = 'force-dynamic'

type RouteContext = { params: { id: string } }

export async function PATCH(req: NextRequest, context: RouteContext) {
  if (!getClientSessionId()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = context.params
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const status = (body as { status?: unknown }).status
  if (status !== 'Interested') {
    return NextResponse.json({ error: 'Only status: Interested is supported' }, { status: 400 })
  }

  try {
    await patchQuoteFieldsInAirtable(id, { Status: 'Interested' })
  } catch (e) {
    console.error('[api/quotes/[id]] Airtable PATCH failed', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Airtable update failed' },
      { status: 502 }
    )
  }

  return NextResponse.json({ ok: true })
}
