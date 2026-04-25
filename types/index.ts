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

export type CallOutcome = 'booked' | 'qualified' | 'not_a_fit' | 'info_only'

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
}

// ─── Dashboard aggregate stats ───────────────────────────────────────────────

export interface DashboardStats {
  totalCalls: number
  totalCallsChange: number
  appointmentsBooked: number
  bookingRate: number
  avgDurationSeconds: number
  leadsQualified: number
  qualifyRate: number
  callsByDay: { day: string; count: number }[]
  outcomeBreakdown: {
    booked: number
    qualified: number
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
  DASHBOARD_PASSWORD: boolean
  NEXT_PUBLIC_APP_URL: boolean
  KV_REST_API_URL: boolean
  KV_REST_API_TOKEN: boolean
}

export interface HealthResponse {
  ok: boolean
  store: { backend: 'vercel-kv' | 'file' | 'unconfigured'; message?: string }
  retell: ServiceHealth
  /** Inbound/receptionist agent id present in env */
  receptionistAgent: { idSet: boolean }
  retellOutboundAgent: { configured: boolean; status?: HealthStatus; message?: string }
  variables: HealthEnvVarPresence
  timestamp: string
}
