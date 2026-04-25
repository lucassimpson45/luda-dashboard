import { NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/auth'
import { listReviews } from '@/lib/persistence'

export async function GET() {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const reviews = await listReviews()
  return NextResponse.json({ reviews })
}
