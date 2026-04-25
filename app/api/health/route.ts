import { NextResponse } from 'next/server'
import { getHealthResponse } from '@/lib/health'

/**
 * Public health check for Vercel / monitoring. No secrets in the body
 * (only boolean flags and connectivity status).
 */
export async function GET() {
  const body = await getHealthResponse()
  return NextResponse.json(body)
}
