import { NextRequest, NextResponse } from 'next/server'
import { appendQuoteFromPayload } from '@/lib/persistence'

/**
 * Browsers open URLs with GET. This route only stores data on POST.
 * n8n must use an HTTP Request node (POST), not a browser address bar.
 */
export async function GET() {
  return NextResponse.json({
    ok: false,
    method: 'Use POST, not a browser visit.',
    hint: 'n8n: add an HTTP Request node → POST → same URL → Body: JSON with your N8N_WEBHOOK_SECRET in `secret` plus lead_name, company, etc.',
  })
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

  const item = await appendQuoteFromPayload(
    o as { secret: string } & Record<string, unknown>
  )
  return NextResponse.json({ ok: true, id: item.id })
}
