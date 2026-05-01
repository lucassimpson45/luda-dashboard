import { NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/auth'
import { fetchQuotes, quoteLeadsToStored } from '@/lib/airtable'
import type { StoredQuote } from '@/types'

/** Client dashboard quote tab — reads from Airtable via `fetchQuotes()` only (not Supabase). */
export async function GET() {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let quotes: StoredQuote[] = []
  try {
    const quoteLeads = await fetchQuotes()
    quotes = quoteLeadsToStored(quoteLeads)
  } catch (e) {
    console.error('[api/quotes] Airtable fetch failed', e)
    quotes = []
  }

  return NextResponse.json({ quotes })
}
