import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let cached: SupabaseClient | null | undefined

/** Decode JWT payload `role` claim (no verification; local env check only). */
function jwtRole(jwt: string): string | null {
  const parts = jwt.split('.')
  if (parts.length < 2) return null
  try {
    let b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const pad = (4 - (b64.length % 4)) % 4
    b64 += '='.repeat(pad)
    const json =
      typeof atob === 'function'
        ? atob(b64)
        : Buffer.from(b64, 'base64').toString('utf8')
    const payload = JSON.parse(json) as { role?: string }
    return payload.role ?? null
  } catch {
    return null
  }
}

/**
 * Single Supabase client for server-side use: **service role** only (never the anon key).
 * Uses `NEXT_PUBLIC_SUPABASE_URL` (project API URL root) and `SUPABASE_SERVICE_ROLE_KEY`.
 */
export function getServiceRoleSupabase(): SupabaseClient | null {
  if (cached !== undefined) {
    return cached
  }

  let url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim()
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim()

  if (!url || !key) {
    cached = null
    return null
  }

  url = url.replace(/\/+$/, '')
  if (/\/rest\/v1$/i.test(url)) {
    url = url.replace(/\/rest\/v1$/i, '')
    console.warn(
      '[supabase] Stripped /rest/v1 from NEXT_PUBLIC_SUPABASE_URL — use the project URL only (https://<ref>.supabase.co).'
    )
  }

  if (!/^https:\/\//i.test(url)) {
    console.error(
      '[supabase] NEXT_PUBLIC_SUPABASE_URL must be an https URL. Wrong values often return HTML instead of JSON.'
    )
  } else if (!/\.supabase\.co\b/i.test(url)) {
    console.warn(
      '[supabase] NEXT_PUBLIC_SUPABASE_URL does not look like *.supabase.co; if requests return HTML, verify the URL.'
    )
  }

  const role = jwtRole(key)
  if (role === 'anon') {
    console.error(
      '[supabase] SUPABASE_SERVICE_ROLE_KEY is the anon JWT. Set the **service_role** secret from Supabase → Project Settings → API (not the anon key).'
    )
    cached = null
    return null
  }

  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return cached
}
