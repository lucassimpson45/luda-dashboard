import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { CampaignForm, FeatureToggles, OnboardPayload } from '@/lib/admin-onboard-types'
import { enabledFeaturesArray } from '@/lib/admin-onboard-types'

export const dynamic = 'force-dynamic'

const ADMIN_COOKIE = 'luda_admin_session'
const ADMIN_COOKIE_VALUE = 'authenticated'

function assertAdminSession(): boolean {
  const c = cookies().get(ADMIN_COOKIE)
  return c?.value === ADMIN_COOKIE_VALUE
}

function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!url || !key) return null
  const base = url.replace(/\/+$/, '').replace(/\/rest\/v1$/i, '')
  return createClient(base, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function parseFeatures(v: unknown): FeatureToggles | null {
  if (!isRecord(v)) return null
  const r = v as Record<string, unknown>
  return {
    receptionist: Boolean(r.receptionist),
    quoteFollowUp: Boolean(r.quoteFollowUp),
    reviewRequest: Boolean(r.reviewRequest),
    outbound: Boolean(r.outbound),
  }
}

function parseCampaign(v: unknown): CampaignForm | null {
  if (!isRecord(v)) return null
  const ch = v.channel
  if (ch !== 'sms' && ch !== 'email' && ch !== 'both') return null
  const steps = v.steps
  if (!Array.isArray(steps) || steps.length === 0) return null
  const parsedSteps = steps.map((s) => {
    if (!isRecord(s)) return null
    return {
      id: String(s.id ?? ''),
      delayHours: Number(s.delayHours) || 0,
      smsTemplate: typeof s.smsTemplate === 'string' ? s.smsTemplate : '',
      emailTemplate: typeof s.emailTemplate === 'string' ? s.emailTemplate : '',
    }
  })
  if (parsedSteps.some((x) => x == null)) return null
  return {
    channel: ch,
    sendWindowStart: typeof v.sendWindowStart === 'string' ? v.sendWindowStart : '09:00',
    sendWindowEnd: typeof v.sendWindowEnd === 'string' ? v.sendWindowEnd : '18:00',
    followUpIntervalHours: Math.max(1, Number(v.followUpIntervalHours) || 24),
    maxAttempts: Math.max(1, Math.floor(Number(v.maxAttempts) || 5)),
    steps: parsedSteps as CampaignForm['steps'],
  }
}

function parsePayload(body: unknown): OnboardPayload | { error: string } {
  if (!isRecord(body)) return { error: 'Invalid JSON body' }
  const basics = body.basics
  if (!isRecord(basics)) return { error: 'Missing basics' }
  const name = typeof basics.name === 'string' ? basics.name.trim() : ''
  const password = typeof basics.password === 'string' ? basics.password : ''
  const notificationEmail =
    typeof basics.notificationEmail === 'string' ? basics.notificationEmail.trim() : ''
  const timezone = typeof basics.timezone === 'string' ? basics.timezone.trim() : ''
  const businessType =
    typeof basics.businessType === 'string' ? basics.businessType.trim() : ''
  const logoUrl =
    typeof basics.logoUrl === 'string' && basics.logoUrl.trim() ? basics.logoUrl.trim() : ''
  const features = parseFeatures(basics.features)
  if (!name || !password) return { error: 'Business name and password are required' }
  if (!notificationEmail) return { error: 'Notification email is required' }
  if (!timezone) return { error: 'Timezone is required' }
  if (!businessType) return { error: 'Business type is required' }
  if (!features) return { error: 'Invalid feature toggles' }

  const voice = body.voice
  if (!isRecord(voice)) return { error: 'Missing voice' }
  const messaging = body.messaging
  if (!isRecord(messaging)) return { error: 'Missing messaging' }

  const quoteCampaign = parseCampaign(body.quoteCampaign)
  const reviewCampaign = parseCampaign(body.reviewCampaign)
  if (features.quoteFollowUp && !quoteCampaign) return { error: 'Invalid quote campaign' }
  if (features.reviewRequest && !reviewCampaign) return { error: 'Invalid review campaign' }

  return {
    basics: {
      name,
      businessType,
      notificationEmail,
      timezone,
      logoUrl,
      password,
      features,
    },
    voice: {
      inboundAgentId: typeof voice.inboundAgentId === 'string' ? voice.inboundAgentId.trim() : '',
      outboundAgentId:
        typeof voice.outboundAgentId === 'string' ? voice.outboundAgentId.trim() : '',
      agentPhoneNumber:
        typeof voice.agentPhoneNumber === 'string' ? voice.agentPhoneNumber.trim() : '',
    },
    messaging: {
      twilioNumber:
        typeof messaging.twilioNumber === 'string' ? messaging.twilioNumber.trim() : '',
      resendFromEmail:
        typeof messaging.resendFromEmail === 'string' ? messaging.resendFromEmail.trim() : '',
      resendFromName:
        typeof messaging.resendFromName === 'string' ? messaging.resendFromName.trim() : '',
      googleReviewUrl:
        typeof messaging.googleReviewUrl === 'string' ? messaging.googleReviewUrl.trim() : '',
      webhookSecret:
        typeof messaging.webhookSecret === 'string' ? messaging.webhookSecret.trim() : '',
    },
    quoteCampaign: quoteCampaign ?? {
      channel: 'both',
      sendWindowStart: '09:00',
      sendWindowEnd: '18:00',
      followUpIntervalHours: 24,
      maxAttempts: 5,
      steps: [],
    },
    reviewCampaign: reviewCampaign ?? {
      channel: 'both',
      sendWindowStart: '09:00',
      sendWindowEnd: '18:00',
      followUpIntervalHours: 24,
      maxAttempts: 5,
      steps: [],
    },
  }
}

function buildSequence(campaign: CampaignForm) {
  const ch = campaign.channel
  return campaign.steps.map((s, i) => ({
    step: i + 1,
    delay_hours: s.delayHours,
    channel: ch,
    sms_template: s.smsTemplate || undefined,
    email_template: s.emailTemplate || undefined,
  }))
}

export async function POST(req: NextRequest) {
  if (!assertAdminSession()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getAdminSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 })
  }

  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = parsePayload(raw)
  if ('error' in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }
  const payload = parsed

  const { basics, voice, messaging, quoteCampaign, reviewCampaign } = payload
  const f = basics.features

  if ((f.receptionist || f.outbound) && !voice.inboundAgentId) {
    return NextResponse.json(
      { error: 'Inbound Agent ID is required when Receptionist or Outbound is enabled' },
      { status: 400 }
    )
  }

  if (f.quoteFollowUp || f.reviewRequest) {
    if (!messaging.twilioNumber || !messaging.resendFromEmail) {
      return NextResponse.json(
        {
          error:
            'Twilio number and Resend from email are required when messaging features are enabled',
        },
        { status: 400 }
      )
    }
    if (!messaging.webhookSecret) {
      return NextResponse.json({ error: 'Webhook secret is required' }, { status: 400 })
    }
    if (f.reviewRequest && !messaging.googleReviewUrl) {
      return NextResponse.json(
        { error: 'Google Review URL is required when Review Request is enabled' },
        { status: 400 }
      )
    }
  }

  const retellAgentId = f.receptionist || f.outbound ? voice.inboundAgentId : '-'
  const enabled = enabledFeaturesArray(f)
  const enabled_features = enabled.length > 0 ? enabled : null

  const clientRow: Record<string, unknown> = {
    name: basics.name,
    business_type: basics.businessType,
    retell_agent_id: retellAgentId,
    password: basics.password,
    logo_url: basics.logoUrl || null,
    active: true,
    enabled_features,
    timezone: basics.timezone,
  }

  const { data: clientIns, error: clientErr } = await supabase
    .from('clients')
    .insert(clientRow)
    .select('id')
    .single()

  if (clientErr || !clientIns?.id) {
    console.error('[admin/onboard] clients insert', clientErr)
    const msg = clientErr?.message ?? 'Failed to create client'
    if (/timezone|column .* does not exist/i.test(msg)) {
      delete clientRow.timezone
      const retry = await supabase.from('clients').insert(clientRow).select('id').single()
      if (retry.error || !retry.data?.id) {
        console.error('[admin/onboard] clients insert retry', retry.error)
        return NextResponse.json({ error: 'Failed to create client' }, { status: 500 })
      }
      return await finishOnboard(supabase, retry.data.id as string, payload)
    }
    return NextResponse.json({ error: 'Failed to create client' }, { status: 500 })
  }

  return await finishOnboard(supabase, clientIns.id as string, payload)
}

async function finishOnboard(
  supabase: NonNullable<ReturnType<typeof getAdminSupabase>>,
  clientId: string,
  payload: OnboardPayload
) {
  const { basics, voice, messaging, quoteCampaign, reviewCampaign } = payload
  const f = basics.features

  if (f.quoteFollowUp || f.reviewRequest) {
    const configRow: Record<string, unknown> = {
      client_id: clientId,
      twilio_number: messaging.twilioNumber || null,
      notification_email: basics.notificationEmail || null,
      resend_from_email: messaging.resendFromEmail || null,
      resend_from_name: messaging.resendFromName || null,
      jobber_webhook_secret: messaging.webhookSecret || null,
    }
    if (f.reviewRequest && messaging.googleReviewUrl) {
      configRow.google_review_url = messaging.googleReviewUrl
    }
    if (voice.outboundAgentId) {
      configRow.outbound_retell_agent_id = voice.outboundAgentId
    }
    if (voice.agentPhoneNumber) {
      configRow.agent_phone_number = voice.agentPhoneNumber
    }

    const { error: cfgErr } = await supabase.from('clients_messaging_config').insert(configRow)
    if (cfgErr) {
      console.error('[admin/onboard] messaging_config insert', cfgErr)
      const minimalCfg: Record<string, unknown> = {
        client_id: clientId,
        twilio_number: messaging.twilioNumber || null,
        notification_email: basics.notificationEmail || null,
        resend_from_email: messaging.resendFromEmail || null,
        resend_from_name: messaging.resendFromName || null,
        jobber_webhook_secret: messaging.webhookSecret || null,
      }
      const retryCfg = await supabase.from('clients_messaging_config').insert(minimalCfg)
      if (retryCfg.error) {
        console.error('[admin/onboard] messaging_config insert retry', retryCfg.error)
        await supabase.from('clients').delete().eq('id', clientId)
        return NextResponse.json(
          { error: 'Failed to save messaging config. Check clients_messaging_config table.' },
          { status: 500 }
        )
      }
    }
  }

  const campaigns: Array<{
    type: string
    name: string
    campaign: CampaignForm
  }> = []
  if (f.quoteFollowUp) {
    campaigns.push({
      type: 'quote_followup',
      name: `${basics.name} — Quote follow-up`,
      campaign: quoteCampaign,
    })
  }
  if (f.reviewRequest) {
    campaigns.push({
      type: 'review_request',
      name: `${basics.name} — Review request`,
      campaign: reviewCampaign,
    })
  }

  for (const { type, name, campaign } of campaigns) {
    const row: Record<string, unknown> = {
      client_id: clientId,
      name,
      type,
      channel: campaign.channel,
      sequence: buildSequence(campaign),
      is_active: true,
      send_window_start: campaign.sendWindowStart,
      send_window_end: campaign.sendWindowEnd,
      follow_up_interval_hours: campaign.followUpIntervalHours,
      max_attempts: campaign.maxAttempts,
    }

    let { error: campErr } = await supabase.from('outbound_campaigns').insert(row)
    if (campErr && /column .* does not exist|42703/i.test(campErr.message ?? '')) {
      const minimal = {
        client_id: clientId,
        name,
        type,
        channel: campaign.channel,
        sequence: buildSequence(campaign),
        is_active: true,
      }
      const retry = await supabase.from('outbound_campaigns').insert(minimal)
      campErr = retry.error
    }
    if (campErr) {
      console.error('[admin/onboard] campaign insert', campErr)
      await supabase.from('outbound_campaigns').delete().eq('client_id', clientId)
      await supabase.from('clients_messaging_config').delete().eq('client_id', clientId)
      await supabase.from('clients').delete().eq('id', clientId)
      return NextResponse.json(
        { error: 'Failed to create campaign. Check outbound_campaigns table.' },
        { status: 500 }
      )
    }
  }

  return NextResponse.json({ clientId }, { status: 201 })
}
