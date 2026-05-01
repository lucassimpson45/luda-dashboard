import fs from 'fs/promises'
import path from 'path'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getServiceRoleSupabase } from '@/lib/supabase-service'
import type { QuoteLead, ReviewRequest, StoredQuote, StoredReview } from '@/types'

const filePath = path.join(process.cwd(), '.data', 'webhook-store.json')
const MAX_ITEMS = 500

const isVercelRuntime = process.env.VERCEL === '1' || process.env.VERCEL === 'true'

type FileStoreShape = { quotes: StoredQuote[]; reviews: StoredReview[] }

/** Server-only: service role + normalized project URL (see `lib/supabase-service.ts`). */
export function getSupabase(): SupabaseClient | null {
  return getServiceRoleSupabase()
}

/** On Vercel, skip file I/O. Local file only when Supabase is not configured. */
function canUseFileStore(): boolean {
  if (isVercelRuntime) return false
  if (getSupabase()) return false
  return true
}

export function getStoreBackend(): 'supabase' | 'file' | 'unconfigured' {
  if (getSupabase()) return 'supabase'
  if (isVercelRuntime) return 'unconfigured'
  return 'file'
}

function quoteRowToStored(row: QuoteLead): StoredQuote {
  return {
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
    },
    extra: row.extra && Object.keys(row.extra).length > 0 ? row.extra : undefined,
  }
}

function reviewRowToStored(row: ReviewRequest): StoredReview {
  return {
    id: row.id,
    receivedAt: new Date(row.received_at).toISOString(),
    data: {
      review_id: row.review_id ?? undefined,
      author: row.author ?? undefined,
      rating: row.rating != null && !Number.isNaN(Number(row.rating)) ? Number(row.rating) : undefined,
      platform: row.platform ?? undefined,
      text: row.body ?? undefined,
      link: row.link ?? undefined,
      sentiment: row.sentiment ?? undefined,
    },
    extra: row.extra && Object.keys(row.extra).length > 0 ? row.extra : undefined,
  }
}

async function readFileStore(): Promise<FileStoreShape> {
  try {
    const buf = await fs.readFile(filePath, 'utf-8')
    const data = JSON.parse(buf) as unknown
    if (typeof data !== 'object' || data === null) {
      return { quotes: [], reviews: [] }
    }
    const o = data as { quotes?: StoredQuote[]; reviews?: StoredReview[] }
    return {
      quotes: Array.isArray(o.quotes) ? o.quotes : [],
      reviews: Array.isArray(o.reviews) ? o.reviews : [],
    }
  } catch {
    return { quotes: [], reviews: [] }
  }
}

async function writeFileStore(s: FileStoreShape): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, JSON.stringify(s, null, 2), 'utf-8')
}

export async function listQuotes(): Promise<StoredQuote[]> {
  const supa = getSupabase()
  if (supa) {
    const { data, error } = await supa
      .from('quotes')
      .select('*')
      .order('received_at', { ascending: false })
      .limit(MAX_ITEMS)
    if (error) {
      console.error('[persistence] listQuotes', error)
      return []
    }
    if (!data || !Array.isArray(data)) return []
    return (data as QuoteLead[]).map(quoteRowToStored)
  }
  if (canUseFileStore()) {
    const s = await readFileStore()
    return s.quotes
  }
  return []
}

export async function listReviews(): Promise<StoredReview[]> {
  const supa = getSupabase()
  if (supa) {
    const { data, error } = await supa
      .from('reviews')
      .select('*')
      .order('received_at', { ascending: false })
      .limit(MAX_ITEMS)
    if (error) {
      console.error('[persistence] listReviews', error)
      return []
    }
    if (!data || !Array.isArray(data)) return []
    return (data as ReviewRequest[]).map(reviewRowToStored)
  }
  if (canUseFileStore()) {
    const s = await readFileStore()
    return s.reviews
  }
  return []
}

function stripRecord(obj: Record<string, unknown>, keys: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (keys.includes(k)) continue
    if (v !== undefined) out[k] = v
  }
  return out
}

export async function appendQuoteFromPayload(
  body: { secret: string } & Record<string, unknown>
): Promise<StoredQuote> {
  const { secret: _s, ...rest } = body
  void _s
  const known: StoredQuote['data'] = {
    external_id: typeof rest.external_id === 'string' ? rest.external_id : undefined,
    lead_name: typeof rest.lead_name === 'string' ? rest.lead_name : undefined,
    company: typeof rest.company === 'string' ? rest.company : undefined,
    email: typeof rest.email === 'string' ? rest.email : undefined,
    phone: typeof rest.phone === 'string' ? rest.phone : undefined,
    status: typeof rest.status === 'string' ? rest.status : undefined,
    quote_value: typeof rest.quote_value === 'string' ? rest.quote_value : undefined,
    notes: typeof rest.notes === 'string' ? rest.notes : undefined,
  }
  const extra = stripRecord(rest, [
    'external_id',
    'lead_name',
    'company',
    'email',
    'phone',
    'status',
    'quote_value',
    'notes',
  ])
  const hasExtra = Object.keys(extra).length > 0

  const item: StoredQuote = {
    id: crypto.randomUUID(),
    receivedAt: new Date().toISOString(),
    data: known,
    extra: hasExtra ? extra : undefined,
  }

  const supa = getSupabase()
  if (supa) {
    const row: Omit<QuoteLead, 'received_at'> & { received_at: string } = {
      id: item.id,
      received_at: item.receivedAt,
      external_id: known.external_id ?? null,
      lead_name: known.lead_name ?? null,
      company: known.company ?? null,
      email: known.email ?? null,
      phone: known.phone ?? null,
      status: known.status ?? null,
      quote_value: known.quote_value ?? null,
      notes: known.notes ?? null,
      extra: (hasExtra ? extra : null) as Record<string, unknown> | null,
    }
    const { error } = await supa.from('quotes').insert(row)
    if (error) {
      console.error('[persistence] insert quote', error)
    }
  } else if (canUseFileStore()) {
    const current = await listQuotes()
    const next = [item, ...current].slice(0, MAX_ITEMS)
    const s = await readFileStore()
    s.quotes = next
    await writeFileStore(s)
  }
  return item
}

export async function appendReviewFromPayload(
  body: { secret: string } & Record<string, unknown>
): Promise<StoredReview> {
  const { secret: _s, ...rest } = body
  void _s
  const known: StoredReview['data'] = {
    review_id: typeof rest.review_id === 'string' ? rest.review_id : undefined,
    author: typeof rest.author === 'string' ? rest.author : undefined,
    rating: typeof rest.rating === 'number' && !Number.isNaN(rest.rating) ? rest.rating : undefined,
    platform: typeof rest.platform === 'string' ? rest.platform : undefined,
    text: typeof rest.text === 'string' ? rest.text : undefined,
    link: typeof rest.link === 'string' ? rest.link : undefined,
    sentiment: typeof rest.sentiment === 'string' ? rest.sentiment : undefined,
  }
  const extra = stripRecord(rest, [
    'review_id',
    'author',
    'rating',
    'platform',
    'text',
    'link',
    'sentiment',
  ])
  const hasExtra = Object.keys(extra).length > 0

  const item: StoredReview = {
    id: crypto.randomUUID(),
    receivedAt: new Date().toISOString(),
    data: known,
    extra: hasExtra ? extra : undefined,
  }

  const supa = getSupabase()
  if (supa) {
    const row: {
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
    } = {
      id: item.id,
      received_at: item.receivedAt,
      review_id: known.review_id ?? null,
      author: known.author ?? null,
      rating: known.rating ?? null,
      platform: known.platform ?? null,
      body: known.text ?? null,
      link: known.link ?? null,
      sentiment: known.sentiment ?? null,
      extra: (hasExtra ? extra : null) as Record<string, unknown> | null,
    }
    const { error } = await supa.from('reviews').insert(row)
    if (error) {
      console.error('[persistence] insert review', error)
    }
  } else if (canUseFileStore()) {
    const current = await listReviews()
    const next = [item, ...current].slice(0, MAX_ITEMS)
    const s = await readFileStore()
    s.reviews = next
    await writeFileStore(s)
  }
  return item
}

export async function pingStore(): Promise<{ ok: boolean; error?: string }> {
  try {
    const supa = getSupabase()
    if (supa) {
      const { error } = await supa.from('quotes').select('id').limit(1)
      if (error) {
        return { ok: false, error: error.message }
      }
      return { ok: true }
    }
    if (canUseFileStore()) {
      const s = await readFileStore()
      await writeFileStore(s)
      return { ok: true }
    }
    return { ok: true }
  } catch (e) {
    const err = e instanceof Error ? e.message : 'unknown error'
    return { ok: false, error: err }
  }
}
