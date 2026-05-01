import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getClientById, updateClient, deleteClient, type ClientUpdateInput } from '@/lib/clients'
import { clientToAdminSummary } from '@/lib/admin-client-summary'

export const dynamic = 'force-dynamic'

const ADMIN_COOKIE = 'luda_admin_session'
const ADMIN_COOKIE_VALUE = 'authenticated'

function assertAdminSession(): boolean {
  const c = cookies().get(ADMIN_COOKIE)
  return c?.value === ADMIN_COOKIE_VALUE
}

type RouteContext = { params: { id: string } }

export async function GET(_req: NextRequest, context: RouteContext) {
  if (!assertAdminSession()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = context.params
  const client = await getClientById(id)
  if (!client) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const apiKey = process.env.RETELL_API_KEY ?? ''
  const summary = await clientToAdminSummary(client, apiKey)

  return NextResponse.json({ client, stats: summary })
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  if (!assertAdminSession()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = context.params
  const body = (await req.json()) as Record<string, unknown>

  const patch: ClientUpdateInput = {}

  if (typeof body.name === 'string') patch.name = body.name
  if (body.business_type === null || typeof body.business_type === 'string') {
    patch.business_type = body.business_type as string | null
  }
  if (typeof body.retell_agent_id === 'string') patch.retell_agent_id = body.retell_agent_id
  if (typeof body.password === 'string' && body.password.length > 0) patch.password = body.password
  if (body.logo_url === null || typeof body.logo_url === 'string') {
    patch.logo_url = body.logo_url as string | null
  }
  if (typeof body.active === 'boolean') patch.active = body.active

  const updated = await updateClient(id, patch)
  if (!updated) {
    return NextResponse.json({ error: 'Not found or update failed' }, { status: 404 })
  }

  return NextResponse.json({ client: updated })
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  if (!assertAdminSession()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = context.params
  const ok = await deleteClient(id)
  if (!ok) {
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
