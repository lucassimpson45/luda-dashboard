import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getClientSessionId, isAuthenticated } from '@/lib/auth'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET() {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const clientId = getClientSessionId()
  if (!clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseAdmin = getSupabaseAdmin()

  // Fetch all contacts with their most recent messages per channel
  const { data: contacts, error } = await supabaseAdmin
    .from('outbound_contacts')
    .select(`
      id,
      name,
      phone,
      email,
      status,
      current_step,
      created_at,
      metadata,
      campaign_id,
      outbound_campaigns ( type, name )
    `)
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })

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
