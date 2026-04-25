import { NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/auth'
import { fetchOutboundRetellCalls, normaliseCall } from '@/lib/retell'
import { NormalisedCall } from '@/types'

export async function GET() {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.RETELL_OUTBOUND_AGENT_ID) {
    return NextResponse.json({
      calls: [] as NormalisedCall[],
      error: 'RETELL_OUTBOUND_AGENT_ID is not configured',
    })
  }

  try {
    const raw = await fetchOutboundRetellCalls(200)
    const calls = raw
      .filter((c) => c.call_status === 'ended')
      .map(normaliseCall)
      .sort((a, b) => (a.dateISO > b.dateISO ? -1 : 1))
    return NextResponse.json({ calls, error: null as string | null })
  } catch (err) {
    console.error('[/api/outbound]', err)
    return NextResponse.json({
      calls: [] as NormalisedCall[],
      error: err instanceof Error ? err.message : 'Failed to fetch outbound calls',
    })
  }
}
