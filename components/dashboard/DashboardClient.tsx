'use client'

import { useState, useCallback, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { clsx } from 'clsx'
import { Headphones, FileText, MessageSquareQuote, PhoneOutgoing } from 'lucide-react'
import type {
  DashboardTabId,
  NormalisedCall,
  DashboardStats,
  StoredReview,
} from '@/types'
import { DashboardHeader } from './DashboardHeader'
import { ReceptionistTab } from './ReceptionistTab'
import { QuoteFollowUpTab, type FollowUpContact } from './QuoteFollowUpTab'
import { ReviewsTab } from './ReviewsTab'
import { OutboundTab } from './OutboundTab'

const TABS: {
  id: DashboardTabId
  label: string
  icon: typeof Headphones
}[] = [
  { id: 'receptionist', label: 'Receptionist', icon: Headphones },
  { id: 'quotes', label: 'Quote follow-up', icon: FileText },
  { id: 'reviews', label: 'Reviews', icon: MessageSquareQuote },
  { id: 'outbound', label: 'Outbound', icon: PhoneOutgoing },
]

type InitialBundle = {
  receptionist: { calls: NormalisedCall[]; stats: DashboardStats | null; error: string | null }
  outbound: { calls: NormalisedCall[]; error: string | null }
  followUpContacts: FollowUpContact[]
  reviews: StoredReview[]
}

type CallsApiOk = { calls: NormalisedCall[]; stats: DashboardStats }
type OutboundApiOk = { calls: NormalisedCall[]; error: string | null }
type FollowupApiOk = { contacts: FollowUpContact[] }
type ReviewsApiOk = { reviews: StoredReview[] }

export default function DashboardClient({
  businessName,
  logoUrl,
  initial,
}: {
  businessName: string
  logoUrl: string | null
  initial: InitialBundle
}) {
  const router = useRouter()
  const [tab, setTab] = useState<DashboardTabId>('receptionist')
  const [calls, setCalls] = useState(initial.receptionist.calls)
  const [stats, setStats] = useState<DashboardStats | null>(initial.receptionist.stats)
  const [recError, setRecError] = useState<string | null>(initial.receptionist.error)
  const [outboundCalls, setOutboundCalls] = useState(initial.outbound.calls)
  const [outError, setOutError] = useState<string | null>(initial.outbound.error)
  const [followUpContacts, setFollowUpContacts] = useState(initial.followUpContacts)
  const [reviews, setReviews] = useState(initial.reviews)
  const [refreshing, setRefreshing] = useState(false)

  const refreshAll = useCallback(async () => {
    setRefreshing(true)
    try {
      const [cRes, oRes, fRes, rRes] = await Promise.all([
        fetch('/api/calls'),
        fetch('/api/outbound'),
        fetch('/api/followup'),
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

      if (fRes.ok) {
        const data = (await fRes.json()) as FollowupApiOk
        setFollowUpContacts(data.contacts)
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
      <div className="mx-auto max-w-5xl min-w-0 px-3 py-6 sm:px-4 sm:py-8">
        <DashboardHeader
          businessName={businessName}
          logoUrl={logoUrl}
          refreshing={refreshing}
          onRefresh={() => void refreshAll()}
          onLogout={handleLogout}
        />

        <div className="mb-6 flex gap-0.5 overflow-x-auto border-b border-neutral-200 pb-px dark:border-neutral-800 sm:gap-1">
          {TABS.map((t) => {
            const Icon = t.icon
            return (
              <button
                key={t.id}
                type="button"
                aria-label={t.label}
                title={t.label}
                onClick={() => setTab(t.id)}
                className={clsx(
                  'flex shrink-0 items-center justify-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors sm:px-4',
                  tab === t.id
                    ? 'border-brand text-brand'
                    : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                )}
              >
                <Icon className="h-[18px] w-[18px] shrink-0 sm:hidden" aria-hidden />
                <span className="hidden whitespace-nowrap sm:inline">{t.label}</span>
              </button>
            )
          })}
        </div>

        {tab === 'receptionist' && (
          <ReceptionistTab calls={calls} stats={stats} error={recError} />
        )}
        {tab === 'quotes' && <QuoteFollowUpTab contacts={followUpContacts} />}
        {tab === 'reviews' && <ReviewsTab reviews={reviews} />}
        {tab === 'outbound' && <OutboundTab calls={outboundCalls} error={outError} />}

        <p className="mt-8 flex flex-wrap items-center justify-center gap-2 text-center text-xs text-neutral-300 dark:text-neutral-600">
          <span>Powered by</span>
          <a
            href="https://goluda.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 opacity-90 transition-opacity hover:opacity-100"
          >
            <Image
              src="/luda-ai-logo.png"
              alt="Luda AI"
              width={560}
              height={140}
              className="h-auto max-h-5 w-auto object-contain"
            />
          </a>
        </p>
      </div>
    </div>
  )
}
