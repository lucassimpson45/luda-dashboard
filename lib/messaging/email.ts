import { createClient } from '@supabase/supabase-js'
import { renderTemplate } from './templates'

/** Mirrors outbound campaign `sequence` JSON items; cron resolves SMS/email templates. */
export type CampaignSequenceStep = {
  step: number
  delay_hours: number
  channel: string
  /** Legacy single template when sms/email-specific fields are absent */
  template?: string
  sms_template?: string
  email_template?: string
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface SendEmailOptions {
  contactId: string
  clientId: string
  campaignId: string
  stepIndex: number
  template: string
  fromEmail: string
  fromName: string | null
  toEmail: string
  contact: {
    name?: string | null
    phone?: string | null
    email?: string | null
    metadata?: Record<string, string> | null
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export async function sendEmail(options: SendEmailOptions) {
  const {
    contactId,
    clientId,
    campaignId,
    stepIndex,
    template,
    fromEmail,
    fromName,
    toEmail,
    contact,
  } = options

  const body = renderTemplate(template, {
    ...contact,
    email: toEmail,
  })

  const { data: message, error: insertError } = await supabaseAdmin
    .from('outbound_messages')
    .insert({
      contact_id: contactId,
      client_id: clientId,
      campaign_id: campaignId,
      channel: 'email',
      step_index: stepIndex,
      status: 'queued',
      body,
    })
    .select('id, tracking_token')
    .single()

  if (insertError || !message) {
    return { success: false as const, error: insertError?.message ?? 'Failed to create message record' }
  }

  const fromHeader =
    fromName?.trim() ? `${fromName.trim()} <${fromEmail}>` : fromEmail

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromHeader,
        to: [toEmail],
        subject: 'Follow-up',
        text: body,
        html: `<p>${escapeHtml(body).replace(/\n/g, '</p><p>')}</p>`,
      }),
    })

    const payload = (await res.json()) as { id?: string; message?: string }

    if (!res.ok) {
      throw new Error(payload.message ?? `Resend error (${res.status})`)
    }

    const resendMessageId = payload.id
    if (!resendMessageId) {
      throw new Error('Resend returned no message id')
    }

    await supabaseAdmin
      .from('outbound_messages')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .eq('id', message.id)

    await supabaseAdmin.from('outbound_events').insert({
      message_id: message.id,
      contact_id: contactId,
      client_id: clientId,
      type: 'sent',
      metadata: { resend_id: resendMessageId },
    })

    return {
      success: true as const,
      messageId: message.id,
      resendMessageId,
    }
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Resend send failed'

    await supabaseAdmin.from('outbound_messages').update({ status: 'failed' }).eq('id', message.id)

    await supabaseAdmin.from('outbound_events').insert({
      message_id: message.id,
      contact_id: contactId,
      client_id: clientId,
      type: 'failed',
      metadata: { error: errorMessage },
    })

    return { success: false as const, error: errorMessage }
  }
}
