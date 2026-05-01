import { NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/auth'
import { fetchReviews, reviewRequestsToStored } from '@/lib/airtable'
import type { StoredReview } from '@/types'

/** Client dashboard reviews tab — reads from Airtable via `fetchReviews()` only (not Supabase). */
export async function GET() {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let reviews: StoredReview[] = []
  try {
    const reviewRows = await fetchReviews()
    reviews = reviewRequestsToStored(reviewRows)
  } catch (e) {
    console.error('[api/reviews] Airtable fetch failed', e)
    reviews = []
  }

  return NextResponse.json({ reviews })
}
