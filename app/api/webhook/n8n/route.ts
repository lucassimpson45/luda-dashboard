import { NextRequest, NextResponse } from 'next/server'
import { N8NWebhookPayload } from '@/types'

// N8N sends a POST here after each call ends.
// In N8N: HTTP Request node → POST to {NEXT_PUBLIC_APP_URL}/api/webhook/n8n
// with JSON body matching N8NWebhookPayload (include secret field).
//
// This route stores enrichment data in-memory (for demo) or you can
// connect a real DB (Supabase, PlanetScale, etc.) here.
//
// The enriched data is picked up by the calls API via call.metadata.

// Simple in-memory store — replace with DB in production
const enrichmentStore = new Map<string, Partial<N8NWebhookPayload>>()

export async function POST(req: NextRequest) {
  let body: N8NWebhookPayload

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Verify shared secret
  if (body.secret !== process.env.N8N_WEBHOOK_SECRET) {
    console.warn('[webhook] Bad secret received')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { call_id, caller_name, outcome, appointment_time, notes } = body

  if (!call_id) {
    return NextResponse.json({ error: 'call_id required' }, { status: 400 })
  }

  // Store enrichment data keyed by call_id
  enrichmentStore.set(call_id, { caller_name, outcome, appointment_time, notes })

  console.log(`[webhook] Enriched call ${call_id}:`, { caller_name, outcome })

  return NextResponse.json({ ok: true, call_id })
}

// enrichmentStore stays private; import from a shared module (e.g. lib/enrichment-store)
// when the calls API needs to read enrichments.
