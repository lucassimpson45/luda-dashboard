/** Shared types for admin client onboarding wizard and POST /api/admin/onboard */

export type FeatureToggles = {
  receptionist: boolean
  quoteFollowUp: boolean
  reviewRequest: boolean
  outbound: boolean
}

export type CampaignStepForm = {
  id: string
  delayHours: number
  smsTemplate: string
  emailTemplate: string
}

export type CampaignChannel = 'sms' | 'email' | 'both'

export type CampaignForm = {
  channel: CampaignChannel
  sendWindowStart: string
  sendWindowEnd: string
  followUpIntervalHours: number
  maxAttempts: number
  steps: CampaignStepForm[]
}

export type OnboardFormState = {
  basics: {
    name: string
    businessType: string
    notificationEmail: string
    timezone: string
    logoUrl: string
    password: string
    features: FeatureToggles
  }
  voice: {
    inboundAgentId: string
    outboundAgentId: string
    agentPhoneNumber: string
  }
  messaging: {
    twilioNumber: string
    resendFromEmail: string
    resendFromName: string
    googleReviewUrl: string
    webhookSecret: string
  }
  quoteCampaign: CampaignForm
  reviewCampaign: CampaignForm
}

export type OnboardPayload = OnboardFormState

export const US_TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern (ET)' },
  { value: 'America/Chicago', label: 'Central (CT)' },
  { value: 'America/Denver', label: 'Mountain (MT)' },
  { value: 'America/Phoenix', label: 'Arizona (MST)' },
  { value: 'America/Los_Angeles', label: 'Pacific (PT)' },
  { value: 'America/Anchorage', label: 'Alaska (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii (HST)' },
] as const

export const BUSINESS_TYPES = ['Plumber', 'HVAC', 'Roofer', 'Electrician', 'Other'] as const

export function newStepId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `step-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function defaultCampaignForm(): CampaignForm {
  return {
    channel: 'both',
    sendWindowStart: '09:00',
    sendWindowEnd: '18:00',
    followUpIntervalHours: 24,
    maxAttempts: 5,
    steps: [
      {
        id: newStepId(),
        delayHours: 0,
        smsTemplate: '',
        emailTemplate: '',
      },
    ],
  }
}

export function initialOnboardForm(): OnboardFormState {
  return {
    basics: {
      name: '',
      businessType: 'Plumber',
      notificationEmail: '',
      timezone: 'America/New_York',
      logoUrl: '',
      password: '',
      features: {
        receptionist: false,
        quoteFollowUp: false,
        reviewRequest: false,
        outbound: false,
      },
    },
    voice: {
      inboundAgentId: '',
      outboundAgentId: '',
      agentPhoneNumber: '',
    },
    messaging: {
      twilioNumber: '',
      resendFromEmail: '',
      resendFromName: '',
      googleReviewUrl: '',
      webhookSecret: '',
    },
    quoteCampaign: defaultCampaignForm(),
    reviewCampaign: defaultCampaignForm(),
  }
}

export function buildStepFlow(f: FeatureToggles): number[] {
  const flow: number[] = [0]
  if (f.receptionist || f.outbound) flow.push(1)
  if (f.quoteFollowUp || f.reviewRequest) {
    flow.push(2)
    flow.push(3)
  }
  flow.push(4)
  return flow
}

export function enabledFeaturesArray(f: FeatureToggles): string[] {
  const out: string[] = []
  if (f.receptionist) out.push('receptionist')
  if (f.quoteFollowUp) out.push('quote_followup')
  if (f.reviewRequest) out.push('review_request')
  if (f.outbound) out.push('outbound')
  return out
}
