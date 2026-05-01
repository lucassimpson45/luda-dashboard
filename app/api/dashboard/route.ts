import { NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/auth'
import {
  fetchQuotes,
  fetchReviews,
  quoteLeadsToStored,
  reviewRequestsToStored,
} from '@/lib/airtable'
import type { StoredQuote, StoredReview } from '@/types'

/** Combined quotes + reviews for the dashboard (same data as /api/quotes + /api/reviews). */
export async function GET() {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let quotes: StoredQuote[] = []
  let reviews: StoredReview[] = []
  try {
    const [quoteLeads, reviewRows] = await Promise.all([fetchQuotes(), fetchReviews()])
    quotes = quoteLeadsToStored(quoteLeads)
    reviews = reviewRequestsToStored(reviewRows)
  } catch (e) {
    console.error('[api/dashboard] Airtable fetch failed', e)
    quotes = []
    reviews = []
  }

  return NextResponse.json({ quotes, reviews })
}
