import { redirect } from 'next/navigation'
import { isAuthenticated } from '@/lib/auth'
import {
  fetchRetellCalls,
  fetchOutboundRetellCalls,
  normaliseCall,
  computeStats,
} from '@/lib/retell'
import { listQuotes, listReviews } from '@/lib/persistence'
import DashboardClient from '@/components/dashboard/DashboardClient'
import type { NormalisedCall, DashboardStats } from '@/types'

export const revalidate = 60

export default async function DashboardPage() {
  if (!isAuthenticated()) {
    redirect('/login')
  }

  let calls: NormalisedCall[] = []
  let stats: DashboardStats | null = null
  let error: string | null = null

  try {
    const rawCalls = await fetchRetellCalls(200)
    calls = rawCalls
      .filter((c) => c.call_status === 'ended')
      .map(normaliseCall)
      .sort((a, b) => (a.dateISO > b.dateISO ? -1 : 1))
    stats = computeStats(calls)
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

  const [quotes, reviews] = await Promise.all([listQuotes(), listReviews()])

  return (
    <DashboardClient
      initial={{
        receptionist: { calls, stats, error },
        outbound: { calls: outboundCalls, error: outboundError },
        quotes,
        reviews,
      }}
    />
  )
}
