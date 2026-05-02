import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getClientSessionId, isAuthenticated } from '@/lib/auth'

const CAMPAIGN_TYPES = ['quote_followup', 'review_request'] as const
type CampaignTypeFilter = (typeof CAMPAIGN_TYPES)[number]

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function parseCampaignType(raw: string | null): CampaignTypeFilter | null {
  if (raw == null || raw === '') return null
  if ((CAMPAIGN_TYPES as readonly string[]).includes(raw)) {
    return raw as CampaignTypeFilter
  }
  return null
}

export async function GET(req: NextRequest) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const clientId = getClientSessionId()
  if (!clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rawType = req.nextUrl.searchParams.get('type')
  const typeFilter = parseCampaignType(rawType)
  if (rawType != null && rawType !== '' && typeFilter == null) {
    return NextResponse.json(
      { error: `type must be ${CAMPAIGN_TYPES.join(' or ')}` },
      { status: 400 }
    )
  }

  const supabaseAdmin = getSupabaseAdmin()

  const campaignEmbed = typeFilter
    ? `outbound_campaigns!inner ( type, name )`
    : `outbound_campaigns ( type, name )`

  let query = supabaseAdmin
    .from('outbound_contacts')
    .select(
      `
      id,
      name,
      phone,
      email,
      status,
      current_step,
      created_at,
      metadata,
      campaign_id,
      ${campaignEmbed}
    `
    )
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })

  if (typeFilter) {
    query = query.eq('outbound_campaigns.type', typeFilter)
  }

  const { data: contacts, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!contacts || contacts.length === 0) {
    return NextResponse.json({ contacts: [] })
  }

  // For each contact, fetch their last SMS and last email
  const enriched = await Promise.all(
    contacts.map(async (contact) => {
      const { data: messages } = await supabaseAdmin
        .from('outbound_messages')
        .select('id, channel, body, status, sent_at, created_at')
        .eq('contact_id', contact.id)
        .order('created_at', { ascending: false })

      const smsList = (messages ?? []).filter((m) => m.channel === 'sms')
      const emailList = (messages ?? []).filter((m) => m.channel === 'email')

      return {
        ...contact,
        last_sms: smsList[0] ?? null,
        last_email: emailList[0] ?? null,
        sms_count: smsList.length,
        email_count: emailList.length,
      }
    })
  )

  return NextResponse.json({ contacts: enriched })
}
