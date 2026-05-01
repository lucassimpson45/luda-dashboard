import type { ClientPublic } from '@/lib/clients'
import type { AdminClientSummary } from '@/types'
import { computeStats, normaliseCall, postListRetellCalls } from '@/lib/retell'

export async function clientToAdminSummary(
  client: ClientPublic,
  apiKey: string
): Promise<AdminClientSummary> {
  const logoPath = client.logo_url ?? '/client-logo.png'

  if (!client.retell_agent_id || !apiKey) {
    return {
      id: client.id,
      name: client.name,
      logoPath,
      active: client.active,
      totalCalls: 0,
      lastCallDate: null,
      appointmentsBooked: 0,
      bookingRate: 0,
    }
  }

  try {
    const rawCalls = await postListRetellCalls(apiKey, {
      limit: 100,
      agentId: client.retell_agent_id,
      cacheNoStore: true,
    })
    const normalised = rawCalls
      .filter((c) => c.call_status === 'ended')
      .map(normaliseCall)
    const stats = computeStats(normalised)

    let lastCallDate: string | null = null
    if (rawCalls.length > 0) {
      const maxTs = Math.max(...rawCalls.map((c) => c.start_timestamp))
      lastCallDate = new Date(maxTs).toISOString().split('T')[0]
    }

    return {
      id: client.id,
      name: client.name,
      logoPath,
      active: client.active,
      totalCalls: stats.totalCalls,
      lastCallDate,
      appointmentsBooked: stats.appointmentsBooked,
      bookingRate: stats.bookingRate,
    }
  } catch {
    return {
      id: client.id,
      name: client.name,
      logoPath,
      active: client.active,
      totalCalls: 0,
      lastCallDate: null,
      appointmentsBooked: 0,
      bookingRate: 0,
    }
  }
}
