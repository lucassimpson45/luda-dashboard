import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import twilio from 'twilio'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  const twilioSignature = req.headers.get('x-twilio-signature') ?? ''
  const url = req.url
  const body = await req.text()
  const params = Object.fromEntries(new URLSearchParams(body))

  const isValid = twilio.validateRequest(
    process.env.TWILIO_AUTH_TOKEN!,
    twilioSignature,
    url,
    params
  )

  if (!isValid && process.env.NODE_ENV === 'production') {
    return new NextResponse('Unauthorized', { status: 403 })
  }

  const inboundFrom = params['From']
  const inboundTo   = params['To']
  const inboundBody = params['Body']

  if (!inboundFrom || !inboundTo) {
    return new NextResponse('Bad Request', { status: 400 })
  }

  const supabaseAdmin = getSupabaseAdmin()

  const optOutKeywords = ['stop', 'stopall', 'unsubscribe', 'cancel', 'end', 'quit']
  const isOptOut = optOutKeywords.includes(inboundBody?.toLowerCase().trim())

  const { data: config } = await supabaseAdmin
    .from('clients_messaging_config')
    .select('client_id, notification_email')
    .eq('twilio_number', inboundTo)
    .single()

  if (!config) {
    return new NextResponse('OK', { status: 200 })
  }

  const { data: contact } = await supabaseAdmin
    .from('outbound_contacts')
    .select('id, campaign_id, name, status')
    .eq('client_id', config.client_id)
    .eq('phone', inboundFrom)
    .in('status', ['active', 'replied'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!contact) {
    return new NextResponse('OK', { status: 200 })
  }

  const { data: lastMessage } = await supabaseAdmin
    .from('outbound_messages')
    .select('id')
    .eq('contact_id', contact.id)
    .eq('channel', 'sms')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const newStatus = isOptOut ? 'opted_out' : 'replied'
  const eventType = isOptOut ? 'opted_out' : 'replied'

  await supabaseAdmin
    .from('outbound_contacts')
    .update({ status: newStatus })
    .eq('id', contact.id)

  await supabaseAdmin.from('outbound_events').insert({
    message_id: lastMessage?.id ?? null,
    contact_id: contact.id,
    client_id: config.client_id,
    type: eventType,
    metadata: { reply_body: inboundBody, from_number: inboundFrom },
  })

  if (!isOptOut && config.notification_email) {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Luda AI <notifications@goluda.ai>',
        to: config.notification_email,
        subject: `📩 ${contact.name ?? inboundFrom} replied to your follow-up`,
        html: `<p>${contact.name ?? inboundFrom} replied: <strong>"${inboundBody}"</strong></p><p>Log in to your dashboard to see more.</p>`,
      }),
    })
  }

  return new NextResponse(
    `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
    { status: 200, headers: { 'Content-Type': 'text/xml' } }
  )
}