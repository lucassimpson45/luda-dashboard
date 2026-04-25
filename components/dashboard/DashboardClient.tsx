'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { clsx } from 'clsx'
import type {
  DashboardTabId,
  NormalisedCall,
  DashboardStats,
  StoredQuote,
  StoredReview,
} from '@/types'
import { LudaLogo } from '@/components/brand/LudaLogo'
import { DashboardHeader } from './DashboardHeader'
import { ReceptionistTab } from './ReceptionistTab'
import { QuoteFollowUpTab } from './QuoteFollowUpTab'
import { ReviewsTab } from './ReviewsTab'
import { OutboundTab } from './OutboundTab'

const TABS: { id: DashboardTabId; label: string }[] = [
  { id: 'receptionist', label: 'Receptionist' },
  { id: 'quotes', label: 'Quote follow-up' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'outbound', label: 'Outbound' },
]

type InitialBundle = {
  receptionist: { calls: NormalisedCall[]; stats: DashboardStats | null; error: string | null }
  outbound: { calls: NormalisedCall[]; error: string | null }
  quotes: StoredQuote[]
  reviews: StoredReview[]
}

type CallsApiOk = { calls: NormalisedCall[]; stats: DashboardStats }
type OutboundApiOk = { calls: NormalisedCall[]; error: string | null }
type QuotesApiOk = { quotes: StoredQuote[] }
type ReviewsApiOk = { reviews: StoredReview[] }

export default function DashboardClient({ initial }: { initial: InitialBundle }) {
  const router = useRouter()
  const [tab, setTab] = useState<DashboardTabId>('receptionist')
  const [calls, setCalls] = useState(initial.receptionist.calls)
  const [stats, setStats] = useState<DashboardStats | null>(initial.receptionist.stats)
  const [recError, setRecError] = useState<string | null>(initial.receptionist.error)
  const [outboundCalls, setOutboundCalls] = useState(initial.outbound.calls)
  const [outError, setOutError] = useState<string | null>(initial.outbound.error)
  const [quotes, setQuotes] = useState(initial.quotes)
  const [reviews, setReviews] = useState(initial.reviews)
  const [refreshing, setRefreshing] = useState(false)

  const refreshAll = useCallback(async () => {
    setRefreshing(true)
    try {
      const [cRes, oRes, qRes, rRes] = await Promise.all([
        fetch('/api/calls'),
        fetch('/api/outbound'),
        fetch('/api/quotes'),
        fetch('/api/reviews'),
      ])

      if (cRes.ok) {
        const data = (await cRes.json()) as CallsApiOk
        setCalls(data.calls)
        setStats(data.stats)
        setRecError(null)
      } else {
        const errBody = (await cRes.json()) as { error?: string }
        setRecError(errBody.error ?? `Request failed (${cRes.status})`)
      }

      if (oRes.ok) {
        const data = (await oRes.json()) as OutboundApiOk
        setOutboundCalls(data.calls)
        setOutError(data.error)
      } else {
        setOutError(`Outbound request failed (${oRes.status})`)
      }

      if (qRes.ok) {
        const data = (await qRes.json()) as QuotesApiOk
        setQuotes(data.quotes)
      }

      if (rRes.ok) {
        const data = (await rRes.json()) as ReviewsApiOk
        setReviews(data.reviews)
      }
    } catch (e) {
      console.error('[dashboard refresh]', e)
    } finally {
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    const id = window.setInterval(() => {
      void refreshAll()
    }, 60_000)
    return () => window.clearInterval(id)
  }, [refreshAll])

  async function handleLogout() {
    await fetch('/api/auth', { method: 'DELETE' })
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <DashboardHeader refreshing={refreshing} onRefresh={() => void refreshAll()} onLogout={handleLogout} />

        <div className="mb-6 flex gap-1 overflow-x-auto border-b border-neutral-200 dark:border-neutral-800">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={clsx(
                'whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
                tab === t.id
                  ? 'border-brand text-brand'
                  : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'receptionist' && (
          <ReceptionistTab calls={calls} stats={stats} error={recError} />
        )}
        {tab === 'quotes' && <QuoteFollowUpTab quotes={quotes} />}
        {tab === 'reviews' && <ReviewsTab reviews={reviews} />}
        {tab === 'outbound' && <OutboundTab calls={outboundCalls} error={outError} />}

        <p className="mt-8 flex flex-wrap items-center justify-center gap-2 text-center text-xs text-neutral-300 dark:text-neutral-600">
          <span>Powered by</span>
          <LudaLogo href="https://goluda.ai" height={20} className="opacity-90" />
          <span>· Retell + N8N</span>
        </p>
      </div>
    </div>
  )
}
