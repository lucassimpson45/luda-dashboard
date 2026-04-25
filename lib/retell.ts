import { RetellCall, NormalisedCall, CallOutcome, DashboardStats } from '@/types'

const RETELL_BASE = 'https://api.retellai.com'

function parseListCallsResponse(data: unknown): RetellCall[] {
  if (Array.isArray(data)) return data as RetellCall[]
  if (typeof data === 'object' && data !== null && 'calls' in data) {
    const calls = (data as { calls: RetellCall[] }).calls
    return Array.isArray(calls) ? calls : []
  }
  return []
}

/** Retell’s list-calls API requires POST, not GET. */
export async function postListRetellCalls(
  apiKey: string,
  options: { limit: number; agentId?: string; cacheNoStore?: boolean }
): Promise<RetellCall[]> {
  const { limit, agentId, cacheNoStore } = options
  const body: {
    limit: number
    filter_criteria?: { agent_id: string[] }
  } = {
    limit,
    filter_criteria: agentId ? { agent_id: [agentId] } : undefined,
  }

  const res = await fetch(`${RETELL_BASE}/v2/list-calls`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    ...(cacheNoStore ? { cache: 'no-store' as const } : { next: { revalidate: 60 } }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Retell API error ${res.status}: ${text}`)
  }

  const data: unknown = await res.json()
  return parseListCallsResponse(data)
}

// ─── Fetch calls from Retell ──────────────────────────────────────────────────

export async function fetchRetellCalls(limit = 100): Promise<RetellCall[]> {
  const agentId = process.env.RETELL_AGENT_ID
  const apiKey = process.env.RETELL_API_KEY

  if (!apiKey) throw new Error('RETELL_API_KEY is not set')

  return postListRetellCalls(apiKey, { limit, agentId: agentId || undefined })
}

// ─── Fetch a single call (for transcript deep-dive) ───────────────────────────

export async function fetchRetellCall(callId: string): Promise<RetellCall> {
  const apiKey = process.env.RETELL_API_KEY
  if (!apiKey) throw new Error('RETELL_API_KEY is not set')

  const res = await fetch(`${RETELL_BASE}/v2/get-call/${callId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    next: { revalidate: 30 },
  })

  if (!res.ok) throw new Error(`Retell API error ${res.status}`)
  return res.json()
}

// ─── Duration helpers ─────────────────────────────────────────────────────────

export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const mins = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// ─── Classify call outcome from Retell analysis ───────────────────────────────
// Retell's custom_analysis_data can carry whatever your agent prompt extracts.
// Adjust the field names below to match your agent's analysis schema.

export function classifyOutcome(call: RetellCall): CallOutcome {
  const analysis = call.call_analysis

  // If your N8N webhook has already enriched this call with an outcome field
  // on metadata, prefer that
  const metaOutcome = call.metadata?.outcome as CallOutcome | undefined
  if (metaOutcome) return metaOutcome

  // Otherwise derive from Retell's own analysis
  const custom = analysis?.custom_analysis_data as Record<string, unknown> | undefined

  // These key names should match whatever you configured in your Retell agent's
  // Post-call analysis schema. Common examples shown below:
  if (custom?.appointment_booked === true) return 'booked'
  if (custom?.lead_qualified === true) return 'qualified'
  if (custom?.not_a_fit === true) return 'not_a_fit'

  // Fallback: short calls with no booking are likely info-only
  if (call.duration_ms < 45_000) return 'info_only'

  return 'info_only'
}

export const OUTCOME_LABELS: Record<CallOutcome, string> = {
  booked: 'Appointment booked',
  qualified: 'Lead qualified',
  not_a_fit: 'Not a fit',
  info_only: 'Info only',
}

// ─── Normalise a raw Retell call into our UI shape ────────────────────────────

export function normaliseCall(call: RetellCall): NormalisedCall {
  const outcome = classifyOutcome(call)
  const durationSeconds = Math.floor(call.duration_ms / 1000)

  const date = new Date(call.start_timestamp)
  const dateISO = date.toISOString().split('T')[0]
  const dateFormatted = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  // Caller name from metadata (set by N8N webhook enrichment) or fallback
  const callerName = (call.metadata?.caller_name as string | undefined) ?? undefined

  // summary: prefer Retell's own call_summary, else first 120 chars of transcript
  const summary =
    call.call_analysis?.call_summary ??
    call.transcript?.slice(0, 120) ??
    'No summary available'

  return {
    id: call.call_id,
    date: dateFormatted,
    dateISO,
    callerNumber: call.from_number ?? 'Unknown',
    callerName,
    durationSeconds,
    durationFormatted: formatDuration(call.duration_ms),
    outcome,
    outcomeLabel: OUTCOME_LABELS[outcome],
    summary,
    transcript: call.transcript_object ?? [],
    rawTranscript: call.transcript ?? '',
    sentiment: call.call_analysis?.user_sentiment ?? 'Unknown',
    recordingUrl: call.recording_url,
    callType: call.call_type,
  }
}

/** List calls for the outbound/sales Retell agent (separate `RETELL_OUTBOUND_AGENT_ID`). */
export async function fetchOutboundRetellCalls(limit = 100): Promise<RetellCall[]> {
  const agentId = process.env.RETELL_OUTBOUND_AGENT_ID
  const apiKey = process.env.RETELL_API_KEY

  if (!apiKey) throw new Error('RETELL_API_KEY is not set')
  if (!agentId) throw new Error('RETELL_OUTBOUND_AGENT_ID is not set')

  return postListRetellCalls(apiKey, { limit, agentId })
}

// ─── Compute dashboard aggregate stats ───────────────────────────────────────

export function computeStats(calls: NormalisedCall[]): DashboardStats {
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

  const thisMonth = calls.filter((c) => new Date(c.dateISO) >= thirtyDaysAgo)
  const lastMonth = calls.filter(
    (c) => new Date(c.dateISO) >= sixtyDaysAgo && new Date(c.dateISO) < thirtyDaysAgo
  )

  const booked = thisMonth.filter((c) => c.outcome === 'booked').length
  const qualified = thisMonth.filter((c) => c.outcome === 'qualified').length
  const not_a_fit = thisMonth.filter((c) => c.outcome === 'not_a_fit').length
  const info_only = thisMonth.filter((c) => c.outcome === 'info_only').length

  const avgDuration =
    thisMonth.length > 0
      ? Math.round(thisMonth.reduce((s, c) => s + c.durationSeconds, 0) / thisMonth.length)
      : 0

  // Calls grouped by day-of-week (Mon–Sun)
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const byCounts = Array(7).fill(0)
  thisMonth.forEach((c) => {
    const dow = new Date(c.dateISO).getDay()
    byCounts[dow]++
  })
  // Reorder Mon first
  const callsByDay = [1, 2, 3, 4, 5, 6, 0].map((i) => ({
    day: dayNames[i],
    count: byCounts[i],
  }))

  return {
    totalCalls: thisMonth.length,
    totalCallsChange: thisMonth.length - lastMonth.length,
    appointmentsBooked: booked,
    bookingRate: thisMonth.length > 0 ? Math.round((booked / thisMonth.length) * 100) : 0,
    avgDurationSeconds: avgDuration,
    leadsQualified: qualified,
    qualifyRate: thisMonth.length > 0 ? Math.round((qualified / thisMonth.length) * 100) : 0,
    callsByDay,
    outcomeBreakdown: { booked, qualified, not_a_fit, info_only },
  }
}
