import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendSms } from '@/lib/messaging/sms'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (
    process.env.NODE_ENV === 'production' &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const now = new Date().toISOString()

  const { data: contacts, error } = await supabaseAdmin
    .from('outbound_contacts')
    .select(`
      id,
      client_id,
      campaign_id,
      name,
      phone,
      email,
      metadata,
      current_step,
      outbound_campaigns (
        id,
        sequence,
        channel
      )
    `)
    .eq('status', 'active')
    .lte('next_send_at', now)
    .not('next_send_at', 'is', null)
    .limit(50)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!contacts || contacts.length === 0) {
    return NextResponse.json({ processed: 0 })
  }

  const results = []

  for (const contact of contacts) {
    const campaign = contact.outbound_campaigns as unknown as {
      id: string
      sequence: Array<{
        step: number
        delay_hours: number
        channel: string
        template: string
      }>
    } | null

    const { data: configRow } = await supabaseAdmin
      .from('clients_messaging_config')
      .select('twilio_number, notification_email')
      .eq('client_id', contact.client_id)
      .maybeSingle()

    const config = configRow as {
      twilio_number: string | null
      notification_email: string | null
    } | null

    if (!campaign || !config) continue

    const sequence = campaign.sequence
    const stepIndex = contact.current_step
    const currentStep = sequence[stepIndex]

    if (!currentStep) {
      await supabaseAdmin
        .from('outbound_contacts')
        .update({ status: 'completed', next_send_at: null })
        .eq('id', contact.id)
      results.push({ contactId: contact.id, action: 'completed' })
      continue
    }

    if (currentStep.channel === 'sms') {
      if (!config.twilio_number || !contact.phone) continue

      const result = await sendSms({
        contactId: contact.id,
        clientId: contact.client_id,
        campaignId: contact.campaign_id,
        stepIndex,
        template: currentStep.template,
        fromNumber: config.twilio_number,
        contact: {
          name: contact.name,
          phone: contact.phone,
          email: contact.email,
          metadata: contact.metadata,
        },
      })

      if (result.success) {
        const nextStep = sequence[stepIndex + 1]
        const nextSendAt = nextStep
          ? new Date(Date.now() + nextStep.delay_hours * 60 * 60 * 1000).toISOString()
          : null

        await supabaseAdmin
          .from('outbound_contacts')
          .update({
            current_step: stepIndex + 1,
            next_send_at: nextSendAt,
            status: nextSendAt ? 'active' : 'completed',
          })
          .eq('id', contact.id)

        results.push({ contactId: contact.id, action: 'sent', step: stepIndex })
      } else {
        results.push({ contactId: contact.id, action: 'failed', error: result.error })
      }
    }
  }

  return NextResponse.json({ processed: results.length, results })
}