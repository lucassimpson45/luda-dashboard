import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { listClients, createClient, type ClientCreateInput } from '@/lib/clients'
import { clientToAdminSummary } from '@/lib/admin-client-summary'
import type { AdminClientSummary } from '@/types'

export const dynamic = 'force-dynamic'

const ADMIN_COOKIE = 'luda_admin_session'
const ADMIN_COOKIE_VALUE = 'authenticated'

function assertAdminSession(): boolean {
  const c = cookies().get(ADMIN_COOKIE)
  return c?.value === ADMIN_COOKIE_VALUE
}

export async function GET() {
  if (!assertAdminSession()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const apiKey = process.env.RETELL_API_KEY ?? ''
  let rows
  try {
    rows = await listClients()
  } catch (e) {
    console.error('[api/admin/clients] listClients failed', e)
    return NextResponse.json(
      { error: 'Could not load clients. Check Supabase URL and service role key.' },
      { status: 503 }
    )
  }

  const clients: AdminClientSummary[] = []

  for (const row of rows) {
    clients.push(await clientToAdminSummary(row, apiKey))
  }

  return NextResponse.json({ clients })
}

export async function POST(req: NextRequest) {
  if (!assertAdminSession()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await req.json()) as Partial<ClientCreateInput> & Record<string, unknown>

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const retell_agent_id =
    typeof body.retell_agent_id === 'string' ? body.retell_agent_id.trim() : ''
  const password = typeof body.password === 'string' ? body.password : ''

  if (!name || !retell_agent_id || !password) {
    return NextResponse.json(
      { error: 'name, retell_agent_id, and password are required' },
      { status: 400 }
    )
  }

  const payload: ClientCreateInput = {
    name,
    retell_agent_id,
    password,
    business_type:
      typeof body.business_type === 'string' && body.business_type.trim()
        ? body.business_type.trim()
        : null,
    logo_url:
      typeof body.logo_url === 'string' && body.logo_url.trim() ? body.logo_url.trim() : null,
    active: body.active !== false,
  }

  let created
  try {
    created = await createClient(payload)
  } catch (e) {
    console.error('[api/admin/clients] createClient failed', e)
    return NextResponse.json(
      { error: 'Could not create client. Check Supabase URL, service role key, and the clients table.' },
      { status: 500 }
    )
  }

  if (!created) {
    return NextResponse.json(
      { error: 'Could not create client. Check Supabase configuration and the clients table.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ client: created }, { status: 201 })
}
