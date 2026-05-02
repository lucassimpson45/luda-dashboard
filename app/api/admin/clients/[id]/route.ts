import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getClientById, updateClient, deleteClient, type ClientUpdateInput } from '@/lib/clients'
import { clientToAdminSummary } from '@/lib/admin-client-summary'
import { getServiceRoleSupabase } from '@/lib/supabase-service'
import type { CampaignForm } from '@/lib/admin-onboard-types'
import { campaignFormToDbPayload } from '@/lib/admin-campaign-helpers'
import type { MessagingConfigRow, OutboundCampaignRow } from '@/lib/admin-campaign-helpers'

export const dynamic = 'force-dynamic'

const ADMIN_COOKIE = 'luda_admin_session'
const ADMIN_COOKIE_VALUE = 'authenticated'

function assertAdminSession(): boolean {
  const c = cookies().get(ADMIN_COOKIE)
  return c?.value === ADMIN_COOKIE_VALUE
}

type RouteContext = { params: { id: string } }

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function parseCampaignInput(v: unknown): ({ id: string | null } & CampaignForm) | null {
  if (!isRecord(v)) return null
  const id =
    typeof v.id === 'string' && v.id.trim().length > 0
      ? v.id.trim()
      : null
  const ch = v.channel
  if (ch !== 'sms' && ch !== 'email' && ch !== 'both') return null
  const steps = v.steps
  if (!Array.isArray(steps) || steps.length === 0) return null
  const parsedSteps = steps.map((s) => {
    if (!isRecord(s)) return null
    return {
      id: typeof s.id === 'string' && s.id.length > 0 ? s.id : randomUUID(),
      delayHours: Number(s.delayHours) || 0,
      smsTemplate: typeof s.smsTemplate === 'string' ? s.smsTemplate : '',
      emailTemplate: typeof s.emailTemplate === 'string' ? s.emailTemplate : '',
    }
  })
  if (parsedSteps.some((x) => x == null)) return null
  return {
    id: id && id.length > 0 ? id : null,
    channel: ch,
    sendWindowStart: typeof v.sendWindowStart === 'string' ? v.sendWindowStart : '09:00',
    sendWindowEnd: typeof v.sendWindowEnd === 'string' ? v.sendWindowEnd : '18:00',
    followUpIntervalHours: Math.max(1, Number(v.followUpIntervalHours) || 24),
    maxAttempts: Math.max(1, Math.floor(Number(v.maxAttempts) || 5)),
    steps: parsedSteps as CampaignForm['steps'],
  }
}

export async function GET(_req: NextRequest, context: RouteContext) {
  if (!assertAdminSession()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = context.params
  const client = await getClientById(id)
  if (!client) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const apiKey = process.env.RETELL_API_KEY ?? ''
  const summary = await clientToAdminSummary(client, apiKey)

  let messaging: MessagingConfigRow | null = null
  let campaigns: OutboundCampaignRow[] = []

  const supabase = getServiceRoleSupabase()
  if (supabase) {
    const { data: m } = await supabase
      .from('clients_messaging_config')
      .select('*')
      .eq('client_id', id)
      .maybeSingle()
    if (m) messaging = m as MessagingConfigRow

    const { data: c } = await supabase
      .from('outbound_campaigns')
      .select('*')
      .eq('client_id', id)
      .order('created_at', { ascending: false })
    campaigns = (c ?? []) as OutboundCampaignRow[]
  }

  return NextResponse.json({ client, stats: summary, messaging, campaigns })
}

async function upsertMessaging(
  supabase: NonNullable<ReturnType<typeof getServiceRoleSupabase>>,
  clientId: string,
  patch: {
    twilio_number: string | null
    notification_email: string | null
    resend_from_email: string | null
    resend_from_name: string | null
    google_review_url: string | null
  }
) {
  const { data: existing } = await supabase
    .from('clients_messaging_config')
    .select('jobber_webhook_secret')
    .eq('client_id', clientId)
    .maybeSingle()

  const prev = existing as { jobber_webhook_secret?: string | null } | null
  const secret = prev?.jobber_webhook_secret?.trim() || randomUUID()

  const full: Record<string, unknown> = {
    client_id: clientId,
    jobber_webhook_secret: secret,
    twilio_number: patch.twilio_number,
    notification_email: patch.notification_email,
    resend_from_email: patch.resend_from_email,
    resend_from_name: patch.resend_from_name,
    google_review_url: patch.google_review_url,
  }

  let { error } = await supabase.from('clients_messaging_config').upsert(full, { onConflict: 'client_id' })
  if (error && /column|42703/i.test(error.message ?? '')) {
    const minimal = {
      client_id: clientId,
      jobber_webhook_secret: secret,
      twilio_number: patch.twilio_number,
      notification_email: patch.notification_email,
      resend_from_email: patch.resend_from_email,
      resend_from_name: patch.resend_from_name,
    }
    const r = await supabase.from('clients_messaging_config').upsert(minimal, { onConflict: 'client_id' })
    error = r.error
  }
  return error
}

async function upsertOneCampaign(
  supabase: NonNullable<ReturnType<typeof getServiceRoleSupabase>>,
  clientId: string,
  clientName: string,
  type: 'quote_followup' | 'review_request',
  payload: { id: string | null } & CampaignForm
) {
  const label = type === 'quote_followup' ? 'Quote follow-up' : 'Review request'
  const name = `${clientName} — ${label}`
  const { id, ...form } = payload
  const sequence = campaignFormToDbPayload(form)

  const full: Record<string, unknown> = {
    name,
    type,
    channel: form.channel,
    sequence,
    is_active: true,
    send_window_start: form.sendWindowStart,
    send_window_end: form.sendWindowEnd,
    follow_up_interval_hours: form.followUpIntervalHours,
    max_attempts: form.maxAttempts,
  }

  const insertRow = { ...full, client_id: clientId }

  if (id) {
    let { error } = await supabase
      .from('outbound_campaigns')
      .update(full)
      .eq('id', id)
      .eq('client_id', clientId)
    if (error && /column|42703/i.test(error.message ?? '')) {
      const minimal = {
        name,
        type,
        channel: form.channel,
        sequence,
        is_active: true,
      }
      const r = await supabase.from('outbound_campaigns').update(minimal).eq('id', id).eq('client_id', clientId)
      error = r.error
    }
    return error
  }

  let { error } = await supabase.from('outbound_campaigns').insert(insertRow)
  if (error && /column|42703/i.test(error.message ?? '')) {
    const minimal = {
      client_id: clientId,
      name,
      type,
      channel: form.channel,
      sequence,
      is_active: true,
    }
    const r = await supabase.from('outbound_campaigns').insert(minimal)
    error = r.error
  }
  return error
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  if (!assertAdminSession()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = context.params
  const body = (await req.json()) as Record<string, unknown>

  const patch: ClientUpdateInput = {}

  if (typeof body.name === 'string') patch.name = body.name
  if (body.business_type === null || typeof body.business_type === 'string') {
    patch.business_type = body.business_type as string | null
  }
  if (typeof body.retell_agent_id === 'string') patch.retell_agent_id = body.retell_agent_id
  if (typeof body.password === 'string' && body.password.length > 0) patch.password = body.password
  if (body.logo_url === null || typeof body.logo_url === 'string') {
    patch.logo_url = body.logo_url as string | null
  }
  if (typeof body.active === 'boolean') patch.active = body.active
  if (body.enabled_features === null) {
    patch.enabled_features = null
  } else if (Array.isArray(body.enabled_features)) {
    patch.enabled_features = body.enabled_features.map((x) => String(x))
  }

  const updated = await updateClient(id, patch)
  if (!updated) {
    return NextResponse.json({ error: 'Not found or update failed' }, { status: 404 })
  }

  const supabase = getServiceRoleSupabase()
  if (!supabase) {
    return NextResponse.json({ client: updated })
  }

  if (isRecord(body.messaging)) {
    const m = body.messaging
    const msgPatch = {
      twilio_number: typeof m.twilio_number === 'string' ? m.twilio_number.trim() || null : null,
      notification_email:
        typeof m.notification_email === 'string' ? m.notification_email.trim() || null : null,
      resend_from_email:
        typeof m.resend_from_email === 'string' ? m.resend_from_email.trim() || null : null,
      resend_from_name:
        typeof m.resend_from_name === 'string' ? m.resend_from_name.trim() || null : null,
      google_review_url:
        typeof m.google_review_url === 'string' ? m.google_review_url.trim() || null : null,
    }
    const msgErr = await upsertMessaging(supabase, id, msgPatch)
    if (msgErr) {
      console.error('[admin/clients PATCH] messaging upsert', msgErr)
      return NextResponse.json({ error: 'Failed to save messaging config' }, { status: 500 })
    }
  }

  if (isRecord(body.campaigns)) {
    const camps = body.campaigns as Record<string, unknown>
    const quote = camps.quote_followup
    const review = camps.review_request

    if (quote !== null && quote !== undefined) {
      const parsed = parseCampaignInput(quote)
      if (!parsed) {
        return NextResponse.json({ error: 'Invalid quote_followup campaign payload' }, { status: 400 })
      }
      const err = await upsertOneCampaign(supabase, id, updated.name, 'quote_followup', parsed)
      if (err) {
        console.error('[admin/clients PATCH] quote campaign', err)
        return NextResponse.json({ error: 'Failed to save quote campaign' }, { status: 500 })
      }
    }

    if (review !== null && review !== undefined) {
      const parsed = parseCampaignInput(review)
      if (!parsed) {
        return NextResponse.json({ error: 'Invalid review_request campaign payload' }, { status: 400 })
      }
      const err = await upsertOneCampaign(supabase, id, updated.name, 'review_request', parsed)
      if (err) {
        console.error('[admin/clients PATCH] review campaign', err)
        return NextResponse.json({ error: 'Failed to save review campaign' }, { status: 500 })
      }
    }
  }

  const refreshed = await getClientById(id)
  return NextResponse.json({ client: refreshed ?? updated })
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  if (!assertAdminSession()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = context.params
  const ok = await deleteClient(id)
  if (!ok) {
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
