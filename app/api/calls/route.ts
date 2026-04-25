import { NextRequest, NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/auth'
import { fetchRetellCalls, normaliseCall, computeStats } from '@/lib/retell'

export async function GET(req: NextRequest) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const rawCalls = await fetchRetellCalls(200)
    const calls = rawCalls
      .filter((c) => c.call_status === 'ended')
      .map(normaliseCall)
      // newest first
      .sort((a, b) => (a.dateISO > b.dateISO ? -1 : 1))

    const stats = computeStats(calls)

    return NextResponse.json({ calls, stats })
  } catch (err) {
    console.error('[/api/calls]', err)
    return NextResponse.json({ error: 'Failed to fetch calls' }, { status: 500 })
  }
}
