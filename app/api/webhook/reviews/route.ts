import { NextRequest, NextResponse } from 'next/server'
import { appendReviewFromPayload } from '@/lib/persistence'

/** Reads now come from Airtable; GET kept for compatibility (empty list). */
export async function GET() {
  return NextResponse.json({ reviews: [] })
}

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }
  const o = body as { secret?: string }
  if (o.secret !== process.env.N8N_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const item = await appendReviewFromPayload(
    o as { secret: string } & Record<string, unknown>
  )
  return NextResponse.json({ ok: true, id: item.id })
}
