import { NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/auth'
import { listQuotes } from '@/lib/persistence'

export async function GET() {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const quotes = await listQuotes()
  return NextResponse.json({ quotes })
}
