'use client'

import { useEffect, useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { ChevronDown, FileText } from 'lucide-react'
import { clsx } from 'clsx'
import type { StoredQuote } from '@/types'
import { categorizeQuoteStatusForUi, type QuoteUiStatusCategory } from '@/lib/airtable'
import { DatePicker, todayYmdUtc } from './DatePicker'
import { MetricCard } from './MetricCard'

type Props = { quotes: StoredQuote[] }

function formatSentDate(iso: string) {
  try {
    return format(parseISO(iso), 'MMM d, yyyy')
  } catch {
    return iso
  }
}

/** YYYY-MM-DD in UTC for comparison with DatePicker value. */
function ymdUtcFromIso(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return todayYmdUtc()
  return d.toISOString().slice(0, 10)
}

function minQuoteYmdUtc(quotes: StoredQuote[]): string {
  if (quotes.length === 0) return todayYmdUtc()
  return quotes.reduce((min, q) => {
    const y = ymdUtcFromIso(q.receivedAt)
    return y < min ? y : min
  }, ymdUtcFromIso(quotes[0].receivedAt))
}

function badgeStyles(cat: QuoteUiStatusCategory): string {
  switch (cat) {
    case 'interested':
      return 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200'
    case 'follow_up':
      return 'bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200'
    case 'cold':
      return 'bg-red-100 text-red-900 dark:bg-red-950/50 dark:text-red-200'
    case 'sent':
      return 'bg-sky-100 text-sky-900 dark:bg-sky-950/50 dark:text-sky-200'
    default:
      return 'bg-neutral-200 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200'
  }
}

function formatEmailBody(raw: string): string {
  const t = raw.trim()
  if ((t.startsWith('{') && t.endsWith('}')) || (t.startsWith('[') && t.endsWith(']'))) {
    try {
      return JSON.stringify(JSON.parse(t), null, 2)
    } catch {
      return raw
    }
  }
  return raw
}

function showMarkInterested(status: string | undefined): boolean {
  const t = (status ?? '').trim().toLowerCase()
  if (t === 'interested' || t.startsWith('interested')) return false
  if (t === 'cold' || t.startsWith('cold')) return false
  return true
}

export function QuoteFollowUpTab({ quotes }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>(() => todayYmdUtc())
  const [localQuotes, setLocalQuotes] = useState<StoredQuote[]>(quotes)
  const [markingId, setMarkingId] = useState<string | null>(null)

  useEffect(() => {
    setLocalQuotes(quotes)
  }, [quotes])

  const todayStr = todayYmdUtc()
  const earliestStr = useMemo(() => minQuoteYmdUtc(localQuotes), [localQuotes])

  const metrics = useMemo(() => {
    let inProgress = 0
    let interested = 0
    let cold = 0
    for (const q of localQuotes) {
      const raw = q.data.status ?? ''
      const cat = categorizeQuoteStatusForUi(raw)
      if (cat === 'follow_up') inProgress += 1
      if (cat === 'interested') interested += 1
      if (cat === 'cold') cold += 1
    }
    return {
      total: localQuotes.length,
      inProgress,
      interested,
      cold,
    }
  }, [localQuotes])

  const quotesOnDate = useMemo(
    () => localQuotes.filter((q) => ymdUtcFromIso(q.receivedAt) === selectedDate),
    [localQuotes, selectedDate]
  )

  async function markInterested(recordId: string) {
    setMarkingId(recordId)
    try {
      const res = await fetch(`/api/quotes/${encodeURIComponent(recordId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Interested' }),
      })
      if (!res.ok) {
        console.error('[quotes] PATCH failed', await res.text())
        return
      }
      setLocalQuotes((prev) =>
        prev.map((q) =>
          q.id === recordId
            ? { ...q, data: { ...q.data, status: 'Interested' } }
            : q
        )
      )
    } finally {
      setMarkingId(null)
    }
  }

  if (localQuotes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-200 py-20 dark:border-neutral-800">
        <FileText className="mb-3 h-10 w-10 text-neutral-300 dark:text-neutral-600" />
        <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">No quote follow-ups yet</p>
        <p className="mt-1 max-w-sm px-4 text-center text-xs text-neutral-400">
          Connect Airtable or add rows in your Quotes table to see them here.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid min-w-0 grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4">
        <MetricCard label="Total sent" value={String(metrics.total)} />
        <MetricCard label="In progress" value={String(metrics.inProgress)} />
        <MetricCard label="Interested" value={String(metrics.interested)} subPositive />
        <MetricCard label="Cold" value={String(metrics.cold)} />
      </div>

      <div className="w-full min-w-0">
        <DatePicker
          selectedDate={selectedDate}
          onChange={setSelectedDate}
          minDate={earliestStr}
          maxDate={todayStr}
        />
      </div>

      {quotesOnDate.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-200 py-16 dark:border-neutral-800">
          <FileText className="mb-3 h-10 w-10 text-neutral-300 dark:text-neutral-600" />
          <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">No quotes on this date</p>
          <p className="mt-2 text-xs text-neutral-400 dark:text-neutral-500">← Try a different date</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {quotesOnDate.map((q) => {
            const name = q.data.lead_name ?? q.data.company ?? 'Customer'
            const service = q.data.service ?? '—'
            const amount = q.data.quote_value ?? '—'
            const statusRaw = q.data.status ?? ''
            const cat = categorizeQuoteStatusForUi(statusRaw)
            const sentCount = q.data.sentCount ?? 0
            const lastEmailSent = (q.data.lastEmailSent ?? '').trim()
            const hasEmail = lastEmailSent.length > 0
            const open = expandedId === q.id
            const canMark = showMarkInterested(statusRaw)

            return (
              <li
                key={q.id}
                className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900/80"
              >
                <div className="p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1 space-y-3">
                      <h3 className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-white">{name}</h3>
                      <p className="text-sm text-neutral-600 dark:text-neutral-300">
                        <span className="font-medium text-neutral-800 dark:text-neutral-200">{service}</span>
                        <span className="mx-2 text-neutral-300 dark:text-neutral-600">·</span>
                        <span className="font-medium text-neutral-800 dark:text-neutral-200">{amount}</span>
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={clsx(
                            'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
                            badgeStyles(cat)
                          )}
                        >
                          {statusRaw || 'Unknown'}
                        </span>
                        {sentCount > 0 && (
                          <span className="inline-flex rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-0.5 text-xs font-medium text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                            Follow Up {sentCount}
                          </span>
                        )}
                        <time
                          className="text-xs text-neutral-500 dark:text-neutral-400"
                          dateTime={q.receivedAt}
                        >
                          {formatSentDate(q.receivedAt)}
                        </time>
                      </div>
                    </div>
                    {canMark && (
                      <button
                        type="button"
                        disabled={markingId === q.id}
                        onClick={() => void markInterested(q.id)}
                        className="shrink-0 self-end rounded-full border border-green-500 px-3 py-1 text-xs text-green-400 transition-colors hover:bg-green-500/10 disabled:opacity-50 sm:self-start"
                      >
                        {markingId === q.id ? 'Saving…' : 'Mark as Interested'}
                      </button>
                    )}
                  </div>

                  {hasEmail && (
                    <div className="mt-4 border-t border-neutral-100 pt-3 dark:border-neutral-800">
                      <button
                        type="button"
                        aria-expanded={open}
                        onClick={() => setExpandedId(open ? null : q.id)}
                        className="flex w-full items-center justify-between gap-2 rounded-lg px-1 py-2 text-left text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:text-neutral-200 dark:hover:bg-neutral-800/80"
                      >
                        <span>Last email sent</span>
                        <ChevronDown
                          size={18}
                          className={clsx(
                            'shrink-0 text-neutral-400 transition-transform duration-300 ease-out',
                            open && 'rotate-180'
                          )}
                          aria-hidden
                        />
                      </button>
                      <div
                        className={clsx(
                          'grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none',
                          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                        )}
                      >
                        <div className="min-h-0 overflow-hidden">
                          <div className="pb-1 pt-2">
                            <pre
                              className="max-h-[min(24rem,50vh)] overflow-auto whitespace-pre-wrap rounded-lg border border-neutral-100 bg-neutral-50 p-4 font-[inherit] text-sm leading-relaxed text-neutral-800 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200"
                              style={{ fontFamily: 'inherit' }}
                            >
                              {formatEmailBody(lastEmailSent)}
                            </pre>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
