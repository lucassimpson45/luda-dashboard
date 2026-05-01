import twilioClient from '@/lib/twilio'
import { createClient } from '@supabase/supabase-js'
import { renderTemplate } from './templates'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface SendSmsOptions {
  contactId: string
  clientId: string
  campaignId: string
  stepIndex: number
  template: string
  fromNumber: string
  contact: {
    name?: string | null
    phone: string
    email?: string | null
    metadata?: Record<string, string> | null
  }
}

export async function sendSms(options: SendSmsOptions) {
  const { contactId, clientId, campaignId, stepIndex, template, fromNumber, contact } = options

  const body = renderTemplate(template, contact)

  const { data: message, error: insertError } = await supabaseAdmin
    .from('outbound_messages')
    .insert({
      contact_id: contactId,
      client_id: clientId,
      campaign_id: campaignId,
      channel: 'sms',
      step_index: stepIndex,
      status: 'queued',
      body,
    })
    .select('id, tracking_token')
    .single()

  if (insertError || !message) {
    return { success: false, error: insertError?.message ?? 'Failed to create message record' }
  }

  try {
    const twilioMessage = await twilioClient.messages.create({
      body,
      from: fromNumber,
      to: contact.phone,
    })

    await supabaseAdmin
      .from('outbound_messages')
      .update({
        status: 'sent',
        twilio_sid: twilioMessage.sid,
        sent_at: new Date().toISOString(),
      })
      .eq('id', message.id)

    await supabaseAdmin.from('outbound_events').insert({
      message_id: message.id,
      contact_id: contactId,
      client_id: clientId,
      type: 'sent',
      metadata: { twilio_sid: twilioMessage.sid },
    })

    return { success: true, messageId: message.id, twilioSid: twilioMessage.sid }

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Twilio send failed'

    await supabaseAdmin
      .from('outbound_messages')
      .update({ status: 'failed' })
      .eq('id', message.id)

    await supabaseAdmin.from('outbound_events').insert({
      message_id: message.id,
      contact_id: contactId,
      client_id: clientId,
      type: 'failed',
      metadata: { error: errorMessage },
    })

    return { success: false, error: errorMessage }
  }
}