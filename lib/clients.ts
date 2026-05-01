import { getSupabase } from '@/lib/persistence'

export type ClientPublic = {
  id: string
  created_at: string
  name: string
  business_type: string | null
  retell_agent_id: string
  logo_url: string | null
  active: boolean
}

export type ClientCreateInput = {
  name: string
  business_type?: string | null
  retell_agent_id: string
  password: string
  logo_url?: string | null
  active?: boolean
}

export type ClientUpdateInput = {
  name?: string
  business_type?: string | null
  retell_agent_id?: string
  password?: string
  logo_url?: string | null
  active?: boolean
}

const PUBLIC_FIELDS =
  'id, created_at, name, business_type, retell_agent_id, logo_url, active' as const

function rowToPublic(row: Record<string, unknown>): ClientPublic {
  return {
    id: String(row.id),
    created_at: String(row.created_at),
    name: String(row.name),
    business_type: row.business_type != null ? String(row.business_type) : null,
    retell_agent_id: String(row.retell_agent_id),
    logo_url: row.logo_url != null ? String(row.logo_url) : null,
    active: Boolean(row.active),
  }
}

function logSupabaseError(operation: string, error: unknown): void {
  if (error && typeof error === 'object') {
    const e = error as Record<string, unknown>
    const serializable = {
      message: e.message,
      details: e.details,
      hint: e.hint,
      code: e.code,
    }
    console.error(`[clients] ${operation} Supabase error (fields):`, JSON.stringify(serializable, null, 2))
  } else {
    console.error(`[clients] ${operation} Supabase error (non-object):`, error)
  }
  console.error(`[clients] ${operation} Supabase full error object:`, error)
}

/** Log PostgREST / Supabase client errors in full, then throw. */
function logSupabaseErrorAndThrow(operation: string, error: unknown): never {
  logSupabaseError(operation, error)
  const msg =
    error && typeof error === 'object' && 'message' in error
      ? String((error as { message: unknown }).message)
      : String(error)
  throw new Error(`[clients] ${operation} failed: ${msg}`)
}

export async function listClients(): Promise<ClientPublic[]> {
  const supabase = getSupabase()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('clients')
    .select(PUBLIC_FIELDS)
    .order('created_at', { ascending: false })

  if (error) {
    logSupabaseErrorAndThrow('listClients', error)
  }

  return (data ?? []).map((r) => rowToPublic(r as Record<string, unknown>))
}

export async function getClientById(id: string): Promise<ClientPublic | null> {
  const supabase = getSupabase()
  if (!supabase || !id) return null

  const { data, error } = await supabase
    .from('clients')
    .select(PUBLIC_FIELDS)
    .eq('id', id)
    .maybeSingle()

  if (error) {
    logSupabaseError('getClientById', error)
    return null
  }

  if (!data) return null
  return rowToPublic(data as Record<string, unknown>)
}

/** Client portal login: match plaintext password on an active row. */
export async function getClientByPassword(password: string): Promise<ClientPublic | null> {
  const supabase = getSupabase()
  if (!supabase || !password) return null

  const { data, error } = await supabase
    .from('clients')
    .select(PUBLIC_FIELDS)
    .eq('password', password)
    .eq('active', true)
    .limit(1)
    .maybeSingle()

  if (error) {
    logSupabaseErrorAndThrow('getClientByPassword', error)
  }

  if (!data) return null
  return rowToPublic(data as Record<string, unknown>)
}

export async function createClient(input: ClientCreateInput): Promise<ClientPublic | null> {
  const supabase = getSupabase()
  if (!supabase) return null

  const row = {
    name: input.name.trim(),
    business_type: input.business_type?.trim() || null,
    retell_agent_id: input.retell_agent_id.trim(),
    password: input.password,
    logo_url: input.logo_url?.trim() || null,
    active: input.active !== false,
  }

  const { data, error } = await supabase.from('clients').insert(row).select(PUBLIC_FIELDS).single()

  if (error) {
    logSupabaseErrorAndThrow('createClient', error)
  }

  return rowToPublic(data as Record<string, unknown>)
}

export async function updateClient(
  id: string,
  patch: ClientUpdateInput
): Promise<ClientPublic | null> {
  const supabase = getSupabase()
  if (!supabase || !id) return null

  const row: Record<string, unknown> = {}

  if (patch.name !== undefined) row.name = patch.name.trim()
  if (patch.business_type !== undefined) {
    row.business_type = patch.business_type === null || patch.business_type === '' ? null : patch.business_type.trim()
  }
  if (patch.retell_agent_id !== undefined) row.retell_agent_id = patch.retell_agent_id.trim()
  if (patch.password !== undefined && patch.password.length > 0) row.password = patch.password
  if (patch.logo_url !== undefined) {
    row.logo_url = patch.logo_url === null || patch.logo_url === '' ? null : patch.logo_url.trim()
  }
  if (patch.active !== undefined) row.active = patch.active

  if (Object.keys(row).length === 0) {
    return getClientById(id)
  }

  const { data, error } = await supabase
    .from('clients')
    .update(row)
    .eq('id', id)
    .select(PUBLIC_FIELDS)
    .maybeSingle()

  if (error) {
    logSupabaseError('updateClient', error)
    return null
  }

  if (!data) return null
  return rowToPublic(data as Record<string, unknown>)
}

export async function deleteClient(id: string): Promise<boolean> {
  const supabase = getSupabase()
  if (!supabase || !id) return false

  const { error } = await supabase.from('clients').update({ active: false }).eq('id', id)

  if (error) {
    logSupabaseError('deleteClient', error)
    return false
  }

  return true
}
