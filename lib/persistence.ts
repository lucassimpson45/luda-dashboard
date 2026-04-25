import { createClient, type VercelKV } from '@vercel/kv'
import fs from 'fs/promises'
import path from 'path'
import type { StoredQuote, StoredReview } from '@/types'

const QUOTES_KEY = 'luda:quotes'
const REVIEWS_KEY = 'luda:reviews'
const MAX_ITEMS = 500

const filePath = path.join(process.cwd(), '.data', 'webhook-store.json')

type FileStoreShape = { quotes: StoredQuote[]; reviews: StoredReview[] }

function getKv(): VercelKV | null {
  const url = process.env.KV_REST_API_URL
  const token = process.env.KV_REST_API_TOKEN
  if (!url || !token) return null
  return createClient({ url, token })
}

export function getStoreBackend(): 'vercel-kv' | 'file' | 'unconfigured' {
  if (getKv()) return 'vercel-kv'
  return 'file'
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
  const kv = getKv()
  if (kv) {
    const raw = await kv.get(QUOTES_KEY)
    if (raw === null) return []
    if (typeof raw === 'string') {
      return JSON.parse(raw) as StoredQuote[]
    }
    if (Array.isArray(raw)) {
      return raw as StoredQuote[]
    }
    return []
  }
  const s = await readFileStore()
  return s.quotes
}

export async function listReviews(): Promise<StoredReview[]> {
  const kv = getKv()
  if (kv) {
    const raw = await kv.get(REVIEWS_KEY)
    if (raw === null) return []
    if (typeof raw === 'string') {
      return JSON.parse(raw) as StoredReview[]
    }
    if (Array.isArray(raw)) {
      return raw as StoredReview[]
    }
    return []
  }
  const s = await readFileStore()
  return s.reviews
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

  const current = await listQuotes()
  const next = [item, ...current].slice(0, MAX_ITEMS)
  const kv = getKv()
  if (kv) {
    await kv.set(QUOTES_KEY, JSON.stringify(next))
  } else {
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

  const current = await listReviews()
  const next = [item, ...current].slice(0, MAX_ITEMS)
  const kv = getKv()
  if (kv) {
    await kv.set(REVIEWS_KEY, JSON.stringify(next))
  } else {
    const s = await readFileStore()
    s.reviews = next
    await writeFileStore(s)
  }
  return item
}

export async function pingStore(): Promise<{ ok: boolean; error?: string }> {
  try {
    const kv = getKv()
    if (kv) {
      const k = 'luda:__ping__'
      await kv.set(k, '1', { ex: 10 })
      await kv.get(k)
      return { ok: true }
    }
    const s = await readFileStore()
    await writeFileStore(s)
    return { ok: true }
  } catch (e) {
    const err = e instanceof Error ? e.message : 'unknown error'
    return { ok: false, error: err }
  }
}
