import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getClientSessionId } from '@/lib/auth'
import { getClientById } from '@/lib/clients'
import {
  fetchRetellCalls,
  fetchOutboundRetellCalls,
  normaliseCall,
  computeStats,
} from '@/lib/retell'
import { fetchReviews, reviewRequestsToStored } from '@/lib/airtable'
import DashboardClient from '@/components/dashboard/DashboardClient'
import type { FollowUpContact } from '@/components/dashboard/QuoteFollowUpTab'
import type { NormalisedCall, DashboardStats, StoredReview } from '@/types'

export const revalidate = 60

export default async function DashboardPage() {
  const sessionClientId = getClientSessionId()
  if (!sessionClientId) {
    redirect('/login')
  }

  const client = await getClientById(sessionClientId)
  if (!client?.active) {
    redirect('/login')
  }

  let calls: NormalisedCall[] = []
  let stats: DashboardStats | null = null
  let error: string | null = null

  try {
    if (!client.retell_agent_id?.trim()) {
      error = 'No Retell agent ID is configured for your account. Contact support.'
    } else {
      const rawCalls = await fetchRetellCalls(200, client.retell_agent_id)
      calls = rawCalls
        .filter((c) => c.call_status === 'ended')
        .map(normaliseCall)
        .sort((a, b) => (a.dateISO > b.dateISO ? -1 : 1))
      stats = computeStats(calls)
    }
  } catch (err) {
    console.error('[dashboard]', err)
    error = 'Could not connect to Retell. Check your API key in .env.local.'
  }

  let outboundCalls: NormalisedCall[] = []
  let outboundError: string | null = null
  if (!process.env.RETELL_OUTBOUND_AGENT_ID) {
    outboundError = 'RETELL_OUTBOUND_AGENT_ID is not configured'
  } else {
    try {
      const raw = await fetchOutboundRetellCalls(200)
      outboundCalls = raw
        .filter((c) => c.call_status === 'ended')
        .map(normaliseCall)
        .sort((a, b) => (a.dateISO > b.dateISO ? -1 : 1))
    } catch (err) {
      console.error('[dashboard outbound]', err)
      outboundError = err instanceof Error ? err.message : 'Could not load outbound calls'
    }
  }

  let followUpContacts: FollowUpContact[] = []
  let reviews: StoredReview[] = []
  try {
    const h = headers()
    const host = h.get('host') ?? 'localhost:3000'
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'
    const [followupRes, reviewRows] = await Promise.all([
      fetch(`${protocol}://${host}/api/followup`, {
        cache: 'no-store',
        headers: { cookie: h.get('cookie') ?? '' },
      }),
      fetchReviews(),
    ])
    if (followupRes.ok) {
      const data = (await followupRes.json()) as { contacts: FollowUpContact[] }
      followUpContacts = data.contacts ?? []
    }
    reviews = reviewRequestsToStored(reviewRows)
  } catch (e) {
    console.error('[dashboard] followup/reviews', e)
  }

  return (
    <DashboardClient
      businessName={client.name}
      logoUrl={client.logo_url}
      enabledFeatures={client.enabled_features}
      initial={{
        receptionist: { calls, stats, error },
        outbound: { calls: outboundCalls, error: outboundError },
        followUpContacts,
        reviews,
      }}
    />
  )
}
