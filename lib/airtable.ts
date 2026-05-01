import type { QuoteLead, ReviewRequest, ReviewStatus, StoredQuote, StoredReview } from '@/types'

const AIRTABLE_API = 'https://api.airtable.com/v0'

/** Defaults match your production base; override via env in other environments. */
const DEFAULT_BASE_ID = 'app9ueTFqFsszU9x3'
const DEFAULT_QUOTES_TABLE_ID = 'tblNL3lX8GWJDRS3h'
const DEFAULT_REVIEWS_TABLE_ID = 'tbl7da5zdLNagcc2e'

type AirtableRecord = {
  id: string
  createdTime?: string
  fields: Record<string, unknown>
}

export type QuoteUiStatusCategory = 'interested' | 'follow_up' | 'cold' | 'sent' | 'other'

function airtableEnv(): {
  token: string | undefined
  baseId: string
  quotesTableId: string
  reviewsTableId: string
} {
  return {
    token: process.env.AIRTABLE_API_TOKEN?.trim(),
    baseId: (process.env.AIRTABLE_BASE_ID ?? DEFAULT_BASE_ID).trim(),
    quotesTableId: (process.env.AIRTABLE_QUOTES_TABLE_ID ?? DEFAULT_QUOTES_TABLE_ID).trim(),
    reviewsTableId: (process.env.AIRTABLE_REVIEWS_TABLE_ID ?? DEFAULT_REVIEWS_TABLE_ID).trim(),
  }
}

/** First matching field name (exact, then case-insensitive) — used for reviews table only. */
function field(fields: Record<string, unknown>, ...candidates: string[]): unknown {
  for (const name of candidates) {
    if (fields[name] !== undefined && fields[name] !== null && fields[name] !== '') {
      return fields[name]
    }
  }
  const keys = Object.keys(fields)
  for (const name of candidates) {
    const lower = name.toLowerCase()
    const hit = keys.find((k) => k.toLowerCase() === lower)
    if (hit !== undefined && fields[hit] !== undefined && fields[hit] !== null && fields[hit] !== '') {
      return fields[hit]
    }
  }
  return undefined
}

function str(v: unknown): string | null {
  if (v === undefined || v === null) return null
  if (typeof v === 'string') return v.trim() || null
  if (typeof v === 'number' && !Number.isNaN(v)) return String(v)
  return String(v)
}

function num(v: unknown): number | null {
  if (v === undefined || v === null) return null
  if (typeof v === 'number' && !Number.isNaN(v)) return v
  if (typeof v === 'string') {
    const n = Number(v)
    return Number.isNaN(n) ? null : n
  }
  return null
}

function toIsoTimestamp(v: unknown, fallback: string): string {
  if (v === undefined || v === null || v === '') return fallback
  if (typeof v === 'string') {
    const d = new Date(v)
    if (!Number.isNaN(d.getTime())) return d.toISOString()
  }
  return fallback
}

/** Long text / rich text from Airtable → plain string for email body. */
function longTextField(v: unknown): string | null {
  if (v === undefined || v === null) return null
  if (typeof v === 'string') return v.trim() || null
  if (Array.isArray(v)) {
    const parts = v
      .map((item) => {
        if (typeof item === 'string') return item
        if (item && typeof item === 'object' && 'text' in item) return str((item as { text: unknown }).text)
        return null
      })
      .filter(Boolean)
    return parts.length ? parts.join('\n') : null
  }
  if (typeof v === 'object' && v !== null) {
    const o = v as Record<string, unknown>
    if (typeof o.text === 'string') return o.text.trim() || null
  }
  return str(v)
}

function formatQuoteAmountDisplay(v: unknown): string | null {
  if (v === undefined || v === null) return null
  if (typeof v === 'number' && !Number.isNaN(v)) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(v)
  }
  const raw = str(v)
  if (!raw) return null
  if (/^\s*\$/.test(raw)) return raw.trim()
  const n = num(v)
  if (n !== null) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(n)
  }
  return raw
}

/**
 * Follow Up N Sent → N; Cold / Interested → rollup "Count of follow-up statuses" when set; else 0.
 */
export function deriveQuoteSentCountFromStatus(statusRaw: string, rollupCount: number | null): number {
  const s = statusRaw.trim()
  const m = s.match(/Follow\s*Up\s*(\d+)/i)
  if (m) {
    const n = parseInt(m[1], 10)
    return Number.isFinite(n) ? Math.max(0, n) : 0
  }
  const lower = s.toLowerCase()
  if (lower === 'cold' || lower.startsWith('cold')) {
    return rollupCount ?? 0
  }
  if (lower === 'interested' || lower.startsWith('interested')) {
    return rollupCount ?? 0
  }
  return 0
}

/** Badge + metrics grouping from raw Airtable status (Quote Sent, Follow Up N Sent, Cold, Interested). */
export function categorizeQuoteStatusForUi(raw: string | undefined | null): QuoteUiStatusCategory {
  const s = (raw ?? '').trim()
  if (!s) return 'other'
  if (/follow\s*up/i.test(s)) return 'follow_up'
  const lower = s.toLowerCase()
  if (lower === 'interested' || /^interested\b/i.test(s)) return 'interested'
  if (lower === 'cold' || /^cold\b/i.test(s)) return 'cold'
  if (lower === 'quote sent' || /^quote\s*sent\b/i.test(s)) return 'sent'
  return 'other'
}

export function mapAirtableReviewStatus(raw: unknown): ReviewStatus {
  const s = (str(raw) ?? '').trim().toLowerCase()
  if (s === 'clicked') return 'clicked'
  if (s === 'reviewed') return 'reviewed'
  if (s === 'sent') return 'sent'
  return 'sent'
}

async function fetchTableRecords(tableId: string): Promise<AirtableRecord[]> {
  const { token, baseId } = airtableEnv()
  if (!token) {
    console.warn('[airtable] AIRTABLE_API_TOKEN is not set; skipping Airtable fetch.')
    return []
  }

  const rows: AirtableRecord[] = []
  let offset: string | undefined

  for (let page = 0; page < 50; page++) {
    const url = new URL(`${AIRTABLE_API}/${encodeURIComponent(baseId)}/${encodeURIComponent(tableId)}`)
    url.searchParams.set('pageSize', '100')
    if (offset) url.searchParams.set('offset', offset)

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 60 },
    })

    if (!res.ok) {
      const body = await res.text()
      console.error('[airtable] HTTP', res.status, body.slice(0, 500))
      throw new Error(`Airtable request failed (${res.status})`)
    }

    const json = (await res.json()) as { records?: AirtableRecord[]; offset?: string }
    const batch = json.records ?? []
    rows.push(...batch)
    offset = json.offset
    if (!offset) break
  }

  return rows
}

/**
 * Quotes table: use exact Airtable column names with bracket notation on `record.fields`.
 */
function recordToQuoteLead(rec: AirtableRecord): QuoteLead {
  const f = rec.fields

  const nameCell = f['Name']
  const lead_name =
    nameCell != null && String(nameCell).trim() !== '' ? String(nameCell).trim() : 'Unknown'

  const emailCell = f['Email']
  const email =
    emailCell != null && String(emailCell).trim() !== '' ? String(emailCell).trim() : null

  const phone = String(f['Phone'] ?? '').trim() || null

  const serviceCell = f['Job Type']
  const service =
    serviceCell != null && String(serviceCell).trim() !== '' ? String(serviceCell).trim() : null

  const quoteAmountCell = f['Quote Amount']
  const quote_value = formatQuoteAmountDisplay(
    quoteAmountCell === undefined || quoteAmountCell === null ? 0 : quoteAmountCell
  )

  const statusCell = f['Status']
  const statusRaw =
    statusCell != null && String(statusCell).trim() !== '' ? String(statusCell).trim() : 'Quote Sent'

  const sentAtCell = f['Date Sent']
  const receivedAt = toIsoTimestamp(sentAtCell, rec.createdTime ?? new Date().toISOString())

  const notesCell = f['Notes']
  const notes =
    notesCell != null && String(notesCell).trim() !== '' ? String(notesCell).trim() : null

  const lastEmailSent = longTextField(f['Last Email Sent'])

  const rollupCell = f['Count of follow-up statuses']
  const rollupFollowUps = num(rollupCell)

  const sent_count = deriveQuoteSentCountFromStatus(statusRaw, rollupFollowUps)

  return {
    id: rec.id,
    received_at: receivedAt,
    external_id: null,
    lead_name,
    company: null,
    email,
    phone,
    status: statusRaw,
    quote_value,
    notes,
    extra: null,
    service,
    last_email_sent: lastEmailSent,
    sent_count,
  }
}

function recordToReviewRequest(rec: AirtableRecord): ReviewRequest {
  const f = rec.fields
  const name = str(field(f, 'Name'))
  const phone = str(field(f, 'Phone'))
  const jobType = str(field(f, 'Job Type', 'Job type'))
  const statusRaw = field(f, 'Status')
  const dateSent = field(f, 'Date Sent', 'Date sent')
  const platform = str(field(f, 'Platform'))

  const pipeline: ReviewStatus = mapAirtableReviewStatus(statusRaw)
  const receivedAt = toIsoTimestamp(dateSent, rec.createdTime ?? new Date().toISOString())

  const extra: Record<string, unknown> = {}
  if (phone) extra.phone = phone
  if (jobType) extra.jobType = jobType

  return {
    id: rec.id,
    received_at: receivedAt,
    review_id: null,
    author: name,
    rating: null,
    platform,
    body: null,
    link: null,
    sentiment: pipeline,
    extra: Object.keys(extra).length > 0 ? extra : null,
  }
}

/** PATCH a single quote row in Airtable (e.g. update Status). */
export async function patchQuoteFieldsInAirtable(
  recordId: string,
  fields: Record<string, string | number | boolean | null>
): Promise<void> {
  const { token, baseId, quotesTableId } = airtableEnv()
  if (!token) {
    throw new Error('AIRTABLE_API_TOKEN is not set')
  }

  const url = `${AIRTABLE_API}/${encodeURIComponent(baseId)}/${encodeURIComponent(quotesTableId)}/${encodeURIComponent(recordId)}`

  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields }),
    cache: 'no-store',
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Airtable PATCH ${res.status}: ${text.slice(0, 400)}`)
  }
}

/** Pull quote rows from Airtable and normalise to `QuoteLead`. */
export async function fetchQuotes(): Promise<QuoteLead[]> {
  console.log('[airtable] fetchQuotes called')
  console.log('[airtable] token set:', !!process.env.AIRTABLE_API_TOKEN)
  console.log('[airtable] base:', process.env.AIRTABLE_BASE_ID)
  console.log('[airtable] table:', process.env.AIRTABLE_QUOTES_TABLE_ID)

  const { quotesTableId } = airtableEnv()
  const records = await fetchTableRecords(quotesTableId)

  console.log('[airtable] raw records count:', records.length)
  console.log(
    '[airtable] all record fields sample:',
    JSON.stringify(records.slice(0, 3).map((r) => r.fields))
  )

  const leads = records.map(recordToQuoteLead)
  leads.sort((a, b) => (a.received_at < b.received_at ? 1 : -1))
  return leads
}

/** Pull review rows from Airtable and normalise to `ReviewRequest`. */
export async function fetchReviews(): Promise<ReviewRequest[]> {
  const { reviewsTableId } = airtableEnv()
  const records = await fetchTableRecords(reviewsTableId)
  const rows = records.map(recordToReviewRequest)
  rows.sort((a, b) => (a.received_at < b.received_at ? 1 : -1))
  return rows
}

export function quoteLeadsToStored(rows: QuoteLead[]): StoredQuote[] {
  return rows.map((row) => ({
    id: row.id,
    receivedAt: new Date(row.received_at).toISOString(),
    data: {
      external_id: row.external_id ?? undefined,
      lead_name: row.lead_name ?? undefined,
      company: row.company ?? undefined,
      email: row.email ?? undefined,
      phone: row.phone ?? undefined,
      status: row.status ?? undefined,
      quote_value: row.quote_value ?? undefined,
      notes: row.notes ?? undefined,
      service: row.service ?? undefined,
      lastEmailSent: row.last_email_sent ?? undefined,
      sentCount: row.sent_count,
    },
    extra: row.extra && Object.keys(row.extra).length > 0 ? row.extra : undefined,
  }))
}

export function reviewRequestsToStored(rows: ReviewRequest[]): StoredReview[] {
  return rows.map((row) => ({
    id: row.id,
    receivedAt: new Date(row.received_at).toISOString(),
    data: {
      review_id: row.review_id ?? undefined,
      author: row.author ?? undefined,
      rating: row.rating ?? undefined,
      platform: row.platform ?? undefined,
      text: row.body ?? undefined,
      link: row.link ?? undefined,
      sentiment: row.sentiment ?? undefined,
    },
    extra: row.extra && Object.keys(row.extra).length > 0 ? row.extra : undefined,
  }))
}
