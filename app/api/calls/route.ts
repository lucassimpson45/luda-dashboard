import { NextResponse } from 'next/server'
import { getClientSessionId } from '@/lib/auth'
import { getClientById } from '@/lib/clients'
import { fetchRetellCalls, normaliseCall, computeStats } from '@/lib/retell'

export async function GET() {
  const clientId = getClientSessionId()
  if (!clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const client = await getClientById(clientId)
  if (!client?.active) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!client.retell_agent_id?.trim()) {
    return NextResponse.json({ error: 'No Retell agent configured for this client' }, { status: 500 })
  }

  try {
    const rawCalls = await fetchRetellCalls(200, client.retell_agent_id)
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
