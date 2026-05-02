import type { CampaignForm, CampaignStepForm, FeatureToggles } from '@/lib/admin-onboard-types'
import { defaultCampaignForm, enabledFeaturesArray, newStepId } from '@/lib/admin-onboard-types'
import type { ClientPublic } from '@/lib/clients'

export type CampaignFormWithId = CampaignForm & { id: string | null }

export type MessagingConfigRow = {
  client_id: string
  twilio_number: string | null
  notification_email: string | null
  resend_from_email: string | null
  resend_from_name: string | null
  google_review_url: string | null
  jobber_webhook_secret: string | null
}

export type OutboundCampaignRow = {
  id: string
  client_id: string
  name: string | null
  type: string
  channel: string | null
  sequence: unknown
  is_active?: boolean | null
  send_window_start?: string | null
  send_window_end?: string | null
  follow_up_interval_hours?: number | null
  max_attempts?: number | null
}

/** When null/empty in DB, dashboard shows all tabs — treat as all features enabled in the editor. */
export function featuresFromEnabledList(enabled: string[] | null | undefined): FeatureToggles {
  if (enabled == null || enabled.length === 0) {
    return {
      receptionist: true,
      quoteFollowUp: true,
      reviewRequest: true,
      outbound: true,
    }
  }
  const s = new Set(enabled)
  return {
    receptionist: s.has('receptionist'),
    quoteFollowUp: s.has('quote_followup'),
    reviewRequest: s.has('review_request'),
    outbound: s.has('outbound'),
  }
}

/** Persist: explicit list, or null when all four are on (same as “no restriction”). */
export function enabledListFromFeatures(f: FeatureToggles): string[] | null {
  const arr = enabledFeaturesArray(f)
  if (arr.length === 0) return null
  if (arr.length === 4) return null
  return arr
}

function isSeqStep(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

export function campaignRowToFormWithId(row: OutboundCampaignRow): CampaignFormWithId {
  const ch = (row.channel ?? 'both').toLowerCase()
  const channel: CampaignForm['channel'] =
    ch === 'sms' || ch === 'email' || ch === 'both' ? ch : 'both'

  const raw = row.sequence
  const steps: CampaignStepForm[] = []
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (!isSeqStep(item)) continue
      const delay = Number(item.delay_hours) || 0
      const sms =
        typeof item.sms_template === 'string'
          ? item.sms_template
          : typeof item.template === 'string'
            ? item.template
            : ''
      const email =
        typeof item.email_template === 'string'
          ? item.email_template
          : typeof item.template === 'string'
            ? item.template
            : ''
      steps.push({
        id: newStepId(),
        delayHours: delay,
        smsTemplate: sms,
        emailTemplate: email,
      })
    }
  }
  if (steps.length === 0) {
    const d = defaultCampaignForm()
    return {
      id: row.id,
      ...d,
    }
  }

  return {
    id: row.id,
    channel,
    sendWindowStart: row.send_window_start ?? '09:00',
    sendWindowEnd: row.send_window_end ?? '18:00',
    followUpIntervalHours: row.follow_up_interval_hours ?? 24,
    maxAttempts: row.max_attempts ?? 5,
    steps,
  }
}

export function campaignFormToDbPayload(form: CampaignForm) {
  return form.steps.map((s, i) => ({
    step: i + 1,
    delay_hours: s.delayHours,
    channel: form.channel,
    sms_template: s.smsTemplate || undefined,
    email_template: s.emailTemplate || undefined,
  }))
}

export function emptyMessagingForm(): Omit<MessagingConfigRow, 'client_id'> {
  return {
    twilio_number: '',
    notification_email: '',
    resend_from_email: '',
    resend_from_name: '',
    google_review_url: '',
    jobber_webhook_secret: '',
  }
}

export type AdminEditClientBundle = {
  client: ClientPublic
  messaging: MessagingConfigRow | null
  campaigns: OutboundCampaignRow[]
}
