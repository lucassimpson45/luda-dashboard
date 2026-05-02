import { createHash, timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const TRIGGER_TYPES = ['review_request', 'quote_followup'] as const
type TriggerType = (typeof TRIGGER_TYPES)[number]

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}

/** Constant-time compare for webhook secrets (any length). */
function verifyWebhookSecret(plain: string, stored: string | null | undefined): boolean {
  if (stored == null || stored.length === 0) return false
  const h1 = createHash('sha256').update(plain, 'utf8').digest()
  const h2 = createHash('sha256').update(stored, 'utf8').digest()
  return timingSafeEqual(h1, h2)
}

function normalizeMetadata(m: unknown): Record<string, string> | null {
  if (m == null || typeof m !== 'object' || Array.isArray(m)) return null
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(m as Record<string, unknown>)) {
    out[k] = v == null ? '' : String(v)
  }
  return Object.keys(out).length > 0 ? out : null
}

function isTriggerType(s: unknown): s is TriggerType {
  return typeof s === 'string' && (TRIGGER_TYPES as readonly string[]).includes(s)
}

function isUndefinedColumn(err: { code?: string; message?: string }): boolean {
  return err.code === '42703' || /column .* does not exist/i.test(err.message ?? '')
}

export async function POST(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!url || !key) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 503 })
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

  const o = body as {
    client_id?: unknown
    trigger_type?: unknown
    secret?: unknown
    contact?: unknown
  }

  const clientId = typeof o.client_id === 'string' ? o.client_id.trim() : ''
  if (!clientId || !UUID_RE.test(clientId)) {
    return NextResponse.json({ error: 'client_id must be a valid UUID' }, { status: 400 })
  }

  if (!isTriggerType(o.trigger_type)) {
    return NextResponse.json(
      { error: `trigger_type must be one of: ${TRIGGER_TYPES.join(', ')}` },
      { status: 400 }
    )
  }
  const triggerType = o.trigger_type

  const secret = typeof o.secret === 'string' ? o.secret : ''
  if (!secret) {
    return NextResponse.json({ error: 'secret is required' }, { status: 400 })
  }

  const c = o.contact
  if (typeof c !== 'object' || c === null) {
    return NextResponse.json({ error: 'contact object is required' }, { status: 400 })
  }

  const contact = c as {
    name?: unknown
    phone?: unknown
    email?: unknown
    metadata?: unknown
  }

  const name = typeof contact.name === 'string' ? contact.name.trim() || null : null
  const phone = typeof contact.phone === 'string' ? contact.phone.trim() || null : null
  const email = typeof contact.email === 'string' ? contact.email.trim().toLowerCase() || null : null
  const metadata = normalizeMetadata(contact.metadata)

  if (!phone && !email) {
    return NextResponse.json(
      { error: 'contact must include at least one of phone or email' },
      { status: 400 }
    )
  }

  const supabaseAdmin = getSupabaseAdmin()

  const { data: configRow, error: configErr } = await supabaseAdmin
    .from('clients_messaging_config')
    .select('jobber_webhook_secret')
    .eq('client_id', clientId)
    .maybeSingle()

  if (configErr) {
    console.error('[webhook/trigger] config', configErr)
    return NextResponse.json({ error: 'Lookup failed' }, { status: 500 })
  }

  const storedSecret = (configRow as { jobber_webhook_secret?: string | null } | null)
    ?.jobber_webhook_secret

  if (!verifyWebhookSecret(secret, storedSecret)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let { data: campaignRow, error: campErr } = await supabaseAdmin
    .from('outbound_campaigns')
    .select('id')
    .eq('client_id', clientId)
    .eq('type', triggerType)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (campErr && isUndefinedColumn(campErr)) {
    const second = await supabaseAdmin
      .from('outbound_campaigns')
      .select('id')
      .eq('client_id', clientId)
      .eq('type', triggerType)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    campaignRow = second.data
    campErr = second.error
  }

  if (campErr) {
    console.error('[webhook/trigger] campaign', campErr)
    return NextResponse.json({ error: 'Campaign lookup failed' }, { status: 500 })
  }

  if (!campaignRow?.id) {
    return NextResponse.json({ error: 'No active campaign for this trigger type' }, { status: 404 })
  }

  return await enqueueContact(supabaseAdmin, clientId, campaignRow.id as string, {
    name,
    phone,
    email,
    metadata,
  })
}

async function enqueueContact(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  clientId: string,
  campaignId: string,
  row: {
    name: string | null
    phone: string | null
    email: string | null
    metadata: Record<string, string> | null
  }
) {
  if (row.phone) {
    const { data: byPhone } = await supabaseAdmin
      .from('outbound_contacts')
      .select('id')
      .eq('campaign_id', campaignId)
      .eq('status', 'active')
      .eq('phone', row.phone)
      .maybeSingle()

    if (byPhone) {
      return NextResponse.json({ status: 'already_active' as const })
    }
  }

  if (row.email) {
    const { data: byEmail } = await supabaseAdmin
      .from('outbound_contacts')
      .select('id')
      .eq('campaign_id', campaignId)
      .eq('status', 'active')
      .eq('email', row.email)
      .maybeSingle()

    if (byEmail) {
      return NextResponse.json({ status: 'already_active' as const })
    }
  }

  if (row.phone) {
    const { data: suppressedByPhone } = await supabaseAdmin
      .from('opted_out_contacts')
      .select('id')
      .eq('client_id', clientId)
      .eq('phone', row.phone)
      .maybeSingle()
    if (suppressedByPhone) {
      return NextResponse.json({ status: 'suppressed' as const }, { status: 200 })
    }
  }

  if (row.email) {
    const { data: suppressedByEmail } = await supabaseAdmin
      .from('opted_out_contacts')
      .select('id')
      .eq('client_id', clientId)
      .eq('email', row.email)
      .maybeSingle()
    if (suppressedByEmail) {
      return NextResponse.json({ status: 'suppressed' as const }, { status: 200 })
    }
  }

  const now = new Date().toISOString()

  const { data: inserted, error: insErr } = await supabaseAdmin
    .from('outbound_contacts')
    .insert({
      client_id: clientId,
      campaign_id: campaignId,
      name: row.name,
      phone: row.phone,
      email: row.email,
      metadata: row.metadata,
      status: 'active',
      current_step: 0,
      next_send_at: now,
      source: 'webhook',
    })
    .select('id')
    .single()

  if (insErr || !inserted?.id) {
    console.error('[webhook/trigger] insert', insErr)
    return NextResponse.json({ error: 'Failed to queue contact' }, { status: 500 })
  }

  return NextResponse.json({
    status: 'queued' as const,
    contact_id: inserted.id as string,
  })
}
