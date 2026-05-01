// ─── Retell AI raw call object ────────────────────────────────────────────────
// Based on Retell's API: https://docs.retellai.com/api-references/get-call

export interface RetellCall {
  call_id: string
  agent_id: string
  call_status: 'registered' | 'ongoing' | 'ended' | 'error'
  call_type: 'inbound' | 'outbound'
  start_timestamp: number
  end_timestamp: number
  duration_ms: number
  from_number: string
  to_number: string
  transcript: string
  transcript_object: TranscriptTurn[]
  call_analysis: RetellCallAnalysis
  disconnection_reason?: string
  recording_url?: string
  metadata?: Record<string, unknown>
}

export interface TranscriptTurn {
  role: 'agent' | 'user'
  content: string
  words: { word: string; start: number; end: number }[]
}

export interface RetellCallAnalysis {
  call_summary?: string
  user_sentiment?: 'Positive' | 'Negative' | 'Neutral' | 'Unknown'
  call_successful?: boolean
  custom_analysis_data?: Record<string, unknown>
}

// ─── Normalised call used throughout the dashboard ───────────────────────────

export type CallOutcome =
  | 'booked'
  | 'booking_deleted'
  | 'booking_rescheduled'
  | 'callback_requested'
  | 'quote_requested'
  | 'not_a_fit'
  | 'info_only'

export interface NormalisedCall {
  id: string
  date: string
  dateISO: string
  callerNumber: string
  callerName?: string
  durationSeconds: number
  durationFormatted: string
  outcome: CallOutcome
  outcomeLabel: string
  summary: string
  transcript: TranscriptTurn[]
  rawTranscript: string
  sentiment: string
  recordingUrl?: string
  callType: 'inbound' | 'outbound'
  /** True when the call errored or disconnected for a dial / telephony failure (follow up). */
  failed: boolean
}

// ─── Dashboard aggregate stats ───────────────────────────────────────────────

export interface DashboardStats {
  totalCalls: number
  totalCallsChange: number
  appointmentsBooked: number
  bookingRate: number
  avgDurationSeconds: number
  /** Count of calls classified as `quote_requested` */
  quotesRequested: number
  /** % of calls this month with outcome `quote_requested` */
  quoteRate: number
  callsByDay: { day: string; count: number }[]
  outcomeBreakdown: {
    booked: number
    booking_deleted: number
    booking_rescheduled: number
    callback_requested: number
    quote_requested: number
    not_a_fit: number
    info_only: number
  }
}

// ─── N8N webhook (call enrichment) ────────────────────────────────────────────

export interface N8NWebhookPayload {
  call_id: string
  caller_name?: string
  outcome?: CallOutcome
  appointment_time?: string
  notes?: string
  secret: string
}

// ─── N8N → quote follow-up webhook ───────────────────────────────────────────

export interface N8NQuotePayload {
  secret: string
  /** Id from your CRM or N8N execution */
  external_id?: string
  lead_name?: string
  company?: string
  email?: string
  phone?: string
  status?: string
  quote_value?: string
  notes?: string
}

// ─── N8N → reviews webhook ─────────────────────────────────────────────────

export interface N8NReviewPayload {
  secret: string
  review_id?: string
  author?: string
  rating?: number
  platform?: string
  text?: string
  link?: string
  sentiment?: string
}

/** Quote pipeline labels from Airtable (e.g. Quote Sent, Follow Up 1 Sent, Interested, Cold). */
export type QuoteStatus = 'interested' | 'cold' | 'sent' | 'follow_up' | 'other'

/** Normalised review outreach status (e.g. from Airtable). */
export type ReviewStatus = 'sent' | 'clicked' | 'reviewed'

/** `public.quotes` row in Supabase (snake_case columns), plus optional Airtable fields. */
export interface QuoteLead {
  id: string
  received_at: string
  external_id: string | null
  lead_name: string | null
  company: string | null
  email: string | null
  phone: string | null
  /** Raw status from source (e.g. Airtable: Quote Sent, Follow Up 1 Sent, Interested, Cold). */
  status: string | null
  quote_value: string | null
  notes: string | null
  extra: Record<string, unknown> | null
  /** Airtable Job Type */
  service?: string | null
  /** Airtable Last Email Sent (body) */
  last_email_sent?: string | null
  /** Derived follow-up index for UI */
  sent_count?: number
}

/** `public.reviews` row in Supabase — `body` is the N8N `text` / UI message field */
export interface ReviewRequest {
  id: string
  received_at: string
  review_id: string | null
  author: string | null
  rating: number | null
  platform: string | null
  body: string | null
  link: string | null
  sentiment: string | null
  extra: Record<string, unknown> | null
}

// Stored records (no secret)
export interface StoredQuote {
  id: string
  receivedAt: string
  data: {
    external_id?: string
    lead_name?: string
    company?: string
    email?: string
    phone?: string
    status?: string
    quote_value?: string
    notes?: string
    /** Airtable Job Type */
    service?: string
    /** Airtable Last Email Sent (full body) */
    lastEmailSent?: string
    /** Derived: Follow Up N → N; Cold/Interested → rollup count when set */
    sentCount?: number
  }
  /** Unlisted fields N8N may send, for forward compatibility */
  extra?: Record<string, unknown>
}

export interface StoredReview {
  id: string
  receivedAt: string
  data: {
    review_id?: string
    author?: string
    rating?: number
    platform?: string
    text?: string
    link?: string
    sentiment?: string
  }
  extra?: Record<string, unknown>
}

// ─── Dashboard UI ────────────────────────────────────────────────────────────

export type DashboardTabId = 'receptionist' | 'quotes' | 'reviews' | 'outbound'

// ─── Admin API ───────────────────────────────────────────────────────────────

export type AdminClientSummary = {
  id: string
  name: string
  logoPath: string
  active: boolean
  totalCalls: number
  lastCallDate: string | null
  appointmentsBooked: number
  bookingRate: number
}

// ─── /api/health response ────────────────────────────────────────────────────

export type HealthStatus = 'ok' | 'error' | 'unconfigured' | 'degraded'

export interface ServiceHealth {
  status: HealthStatus
  message?: string
}

/** Per-variable presence only; secret values are never included in API responses. */
export interface HealthEnvVarPresence {
  RETELL_API_KEY: boolean
  RETELL_AGENT_ID: boolean
  RETELL_OUTBOUND_AGENT_ID: boolean
  N8N_WEBHOOK_SECRET: boolean
  NEXT_PUBLIC_APP_URL: boolean
  NEXT_PUBLIC_SUPABASE_URL: boolean
  SUPABASE_SERVICE_ROLE_KEY: boolean
}

export interface HealthResponse {
  ok: boolean
  store: { backend: 'supabase' | 'file' | 'unconfigured'; message?: string }
  retell: ServiceHealth
  /** Inbound/receptionist agent id present in env */
  receptionistAgent: { idSet: boolean }
  retellOutboundAgent: { configured: boolean; status?: HealthStatus; message?: string }
  variables: HealthEnvVarPresence
  timestamp: string
}
