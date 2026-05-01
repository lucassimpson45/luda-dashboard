import type { HealthResponse, ServiceHealth } from '@/types'
import { getStoreBackend, pingStore } from '@/lib/persistence'
import { postListRetellCalls } from '@/lib/retell'

export async function checkRetellReachable(): Promise<ServiceHealth> {
  const key = process.env.RETELL_API_KEY
  if (!key) {
    return { status: 'unconfigured', message: 'RETELL_API_KEY is not set' }
  }
  try {
    await postListRetellCalls(key, { limit: 1, cacheNoStore: true })
    return { status: 'ok' }
  } catch (e) {
    return {
      status: 'error',
      message: e instanceof Error ? e.message : 'Network error',
    }
  }
}

export async function checkOutboundAgent(): Promise<{
  configured: boolean
  status?: ServiceHealth['status']
  message?: string
}> {
  const key = process.env.RETELL_API_KEY
  const agent = process.env.RETELL_OUTBOUND_AGENT_ID
  if (!key) {
    return { configured: false, status: 'unconfigured', message: 'RETELL_API_KEY not set' }
  }
  if (!agent) {
    return { configured: false, status: 'unconfigured', message: 'RETELL_OUTBOUND_AGENT_ID not set' }
  }
  try {
    await postListRetellCalls(key, { limit: 1, agentId: agent, cacheNoStore: true })
    return { configured: true, status: 'ok' }
  } catch (e) {
    return {
      configured: true,
      status: 'error',
      message: e instanceof Error ? e.message : 'Network error',
    }
  }
}

export async function getHealthResponse(): Promise<HealthResponse> {
  const [retell, outboundInfo, storePing] = await Promise.all([
    checkRetellReachable(),
    checkOutboundAgent(),
    pingStore(),
  ])

  const backend = getStoreBackend()
  const storeBackend: HealthResponse['store']['backend'] = storePing.ok
    ? backend
    : 'unconfigured'

  return {
    ok: retell.status === 'ok' && storePing.ok,
    store: {
      backend: storeBackend,
      message: storePing.error,
    },
    retell,
    receptionistAgent: {
      idSet: Boolean(process.env.RETELL_AGENT_ID),
    },
    retellOutboundAgent: {
      configured: outboundInfo.configured,
      status: outboundInfo.status,
      message: outboundInfo.message,
    },
    variables: {
      RETELL_API_KEY: Boolean(process.env.RETELL_API_KEY),
      RETELL_AGENT_ID: Boolean(process.env.RETELL_AGENT_ID),
      RETELL_OUTBOUND_AGENT_ID: Boolean(process.env.RETELL_OUTBOUND_AGENT_ID),
      N8N_WEBHOOK_SECRET: Boolean(process.env.N8N_WEBHOOK_SECRET),
      NEXT_PUBLIC_APP_URL: Boolean(process.env.NEXT_PUBLIC_APP_URL),
      NEXT_PUBLIC_SUPABASE_URL: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    },
    timestamp: new Date().toISOString(),
  }
}
