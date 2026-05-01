import {
  RetellCall,
  NormalisedCall,
  CallOutcome,
  DashboardStats,
  type TranscriptTurn,
} from '@/types'

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

/**
 * Inbound receptionist calls. Pass `agentId` from the logged-in client row; otherwise falls back to
 * `RETELL_AGENT_ID` for tooling and local dev.
 */
export async function fetchRetellCalls(limit = 100, agentId?: string): Promise<RetellCall[]> {
  const resolved =
    (agentId && agentId.trim()) || (process.env.RETELL_AGENT_ID && process.env.RETELL_AGENT_ID.trim()) || ''
  const apiKey = process.env.RETELL_API_KEY

  if (!apiKey) throw new Error('RETELL_API_KEY is not set')
  if (!resolved) throw new Error('No Retell inbound agent ID configured')

  const calls = await postListRetellCalls(apiKey, { limit, agentId: resolved })
  if (calls.length > 0) {
    console.log(
      '[retell] first call call_analysis (debug)',
      JSON.stringify(calls[0].call_analysis ?? null, null, 2)
    )
  }
  return calls
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
// Post-call `custom_analysis_data` booleans (Retell field → outcome). First match wins.

export function classifyOutcome(call: RetellCall): CallOutcome {
  const analysis = call.call_analysis

  // If your N8N webhook has already enriched this call with an outcome field
  // on metadata, prefer that
  const metaOutcome = call.metadata?.outcome as CallOutcome | undefined
  if (metaOutcome) return metaOutcome

  const custom = analysis?.custom_analysis_data as Record<string, unknown> | undefined

  if (custom?.appointment_booked === true) return 'booked'
  if (custom?.booking_deleted === true) return 'booking_deleted'
  if (custom?.booking_rescheduled === true) return 'booking_rescheduled'
  if (custom?.callback_requested === true) return 'callback_requested'
  if (custom?.quote_requested === true) return 'quote_requested'
  if (custom?.not_a_fit === true) return 'not_a_fit'

  return 'info_only'
}

export const OUTCOME_LABELS: Record<CallOutcome, string> = {
  booked: 'Appointment booked',
  booking_deleted: 'Booking deleted',
  booking_rescheduled: 'Rescheduled',
  callback_requested: 'Callback requested',
  quote_requested: 'Quote requested',
  not_a_fit: 'Not a fit',
  info_only: 'Info only',
}

/** One-line display: "Jane Doe · +1…" when we have a name, else phone only. */
export function callerDisplayLine(call: NormalisedCall): string {
  const phone = call.callerNumber
  const name = call.callerName?.trim()
  return name ? `${name} · ${phone}` : phone
}

function formatNameCandidate(raw: string): string | undefined {
  const s = raw.replace(/\s+/g, ' ').trim()
  if (s.length < 2 || s.length > 80) return undefined
  if (/^[\d\s\-+().]+$/.test(s)) return undefined
  if (s.includes('@')) return undefined
  if (/^(yes|no|ok|sure|hello|hi|thanks|thank you)\b/i.test(s)) return undefined
  const words = s.split(/\s+/).filter(Boolean)
  const titled = words
    .map((w) => {
      const lower = w.toLowerCase()
      if (lower.length <= 2 && /^[a-z]{1,2}\.?$/i.test(w)) return lower.toUpperCase()
      return lower.charAt(0).toUpperCase() + lower.slice(1)
    })
    .join(' ')
  return titled || undefined
}

/** Strip known intros from the start only (case-insensitive). Repeat until stable. */
const NAME_INTRO_PREFIXES: RegExp[] = [
  /^my\s+name\s+is\b/i,
  /^i['’]m\b/i,
  /^i\s+am\b/i,
  /^it['’]s\b/i,
  /^it\s+is\b/i,
  /^this\s+is\b/i,
  /^yes\b/i,
  /^sure\b/i,
  /^yeah\b/i,
  /^so\b/i,
  /^well\b/i,
  /^hi\b/i,
  /^hello\b/i,
]

function stripLeadingNameIntros(raw: string): string {
  let s = raw.replace(/\s+/g, ' ').trim()
  for (let guard = 0; guard < 32; guard++) {
    s = s.replace(/^[\s,;:.!?'"()]+/, '').trim()
    let peeled = false
    for (const re of NAME_INTRO_PREFIXES) {
      if (re.test(s)) {
        s = s.replace(re, '').trim()
        peeled = true
        break
      }
    }
    if (!peeled) break
  }
  return s.replace(/^[\s,;:.!?'"()]+/, '').trim()
}

const NUMBER_WORDS = new Set([
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
])

const TRANSCRIPT_NAME_BLOCKLIST = new Set([
  'yes',
  'no',
  'ok',
  'okay',
  'sure',
  'good',
  'well',
  'just',
  'the',
  'and',
  'yeah',
  'yep',
  'nope',
  'hi',
  'hello',
  'thanks',
  'thank',
  'please',
  'is',
  'my',
  'name',
  'it',
  'this',
  'calling',
])

const PROPER_NOUN_WORD = /^[A-Z][a-z]+$/

/**
 * First two letter-only words after intro strip; each must be /^[A-Z][a-z]+$/ after formatting.
 */
function parseNuclearTranscriptName(remainder: string): string | undefined {
  const rawWords = remainder.split(/\s+/).filter(Boolean).slice(0, 2)
  if (rawWords.length === 0) return undefined

  const out: string[] = []
  for (const rw of rawWords) {
    const lettersOnly = rw.replace(/[^A-Za-z]/g, '')
    if (!lettersOnly) return undefined
    const lower = lettersOnly.toLowerCase()
    if (NUMBER_WORDS.has(lower)) return undefined
    if (TRANSCRIPT_NAME_BLOCKLIST.has(lower)) return undefined
    const proper = lettersOnly.charAt(0).toUpperCase() + lettersOnly.slice(1).toLowerCase()
    if (!PROPER_NOUN_WORD.test(proper)) return undefined
    out.push(proper)
  }
  return out.join(' ')
}

/** Agent asked for a name; match Retell copy like "Can I get your full name?" */
function agentAsksForCallerName(content: string): boolean {
  const t = content.toLowerCase()
  return t.includes('full name') || t.includes('name')
}

/** Disconnection reasons we treat as missed / failed (needs follow-up). */
const MISSED_DISCONNECTION_REASONS = new Set([
  'dial_no_answer',
  'dial_failed',
  'dial_busy',
  'error',
  'call_error',
  'telephony_error',
  'telephony_provider_error',
  'invalid_destination',
  'concurrency_limit_reached',
  'sip_routing_error',
  'websocket_error',
  'inbound_call_failed',
])

/** True if Retell reports an error status or a telephony / dial failure. */
export function isCallFailed(call: RetellCall): boolean {
  if (call.call_status === 'error') return true
  const r = call.disconnection_reason
  if (!r || typeof r !== 'string') return false
  const key = r.trim().toLowerCase()
  if (MISSED_DISCONNECTION_REASONS.has(key)) return true
  if (/^dial_(no_answer|failed|busy|timeout)/.test(key)) return true
  return false
}

/**
 * First user reply after an agent turn that asks for (full) name.
 * Very conservative: only ASCII proper-noun pairs like "Lucas" / "Lucas Simpson".
 */
export function extractCallerNameFromTranscript(turns: TranscriptTurn[]): string | undefined {
  for (let i = 0; i < turns.length; i++) {
    const turn = turns[i]
    if (turn.role !== 'agent') continue
    if (!agentAsksForCallerName(turn.content ?? '')) continue
    for (let j = i + 1; j < turns.length; j++) {
      if (turns[j].role === 'agent') break
      if (turns[j].role === 'user') {
        const raw = (turns[j].content ?? '').replace(/\s+/g, ' ').trim()
        const remainder = stripLeadingNameIntros(raw)
        return parseNuclearTranscriptName(remainder)
      }
    }
  }
  return undefined
}

// ─── Normalise a raw Retell call into our UI shape ────────────────────────────

export function normaliseCall(call: RetellCall): NormalisedCall {
  const outcome = classifyOutcome(call)
  const durationSeconds = Math.floor(call.duration_ms / 1000)

  const date = new Date(call.start_timestamp)
  const dateISO = date.toISOString().split('T')[0]
  const dateFormatted = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  const metaRaw = call.metadata?.caller_name
  const fromMeta =
    typeof metaRaw === 'string' && metaRaw.trim() ? formatNameCandidate(metaRaw) : undefined
  const fromTranscript = extractCallerNameFromTranscript(call.transcript_object ?? [])
  const callerName = fromMeta ?? fromTranscript

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
    failed: isCallFailed(call),
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
  const booking_deleted = thisMonth.filter((c) => c.outcome === 'booking_deleted').length
  const booking_rescheduled = thisMonth.filter((c) => c.outcome === 'booking_rescheduled').length
  const callback_requested = thisMonth.filter((c) => c.outcome === 'callback_requested').length
  const quote_requested = thisMonth.filter((c) => c.outcome === 'quote_requested').length
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
    quotesRequested: quote_requested,
    quoteRate: thisMonth.length > 0 ? Math.round((quote_requested / thisMonth.length) * 100) : 0,
    callsByDay,
    outcomeBreakdown: {
      booked,
      booking_deleted,
      booking_rescheduled,
      callback_requested,
      quote_requested,
      not_a_fit,
      info_only,
    },
  }
}
