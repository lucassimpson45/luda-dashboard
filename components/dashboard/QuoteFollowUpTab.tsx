'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight, MessageSquare, Mail, CheckCircle2, Clock, XCircle, AlertCircle } from 'lucide-react'
import { clsx } from 'clsx'

// ─── Types ───────────────────────────────────────────────────────────────────

type FollowUpMessage = {
  id: string
  channel: 'sms' | 'email'
  body: string
  status: string
  sent_at: string | null
  created_at: string
}

export type FollowUpContact = {
  id: string
  name: string | null
  phone: string | null
  email: string | null
  status: string
  current_step: number
  created_at: string
  metadata: Record<string, string> | null
  last_sms: FollowUpMessage | null
  last_email: FollowUpMessage | null
  sms_count: number
  email_count: number
  outbound_campaigns: { type: string; name: string } | null
}

type Props = { contacts: FollowUpContact[] }

type StatusFilterId = 'all' | 'active' | 'replied' | 'completed' | 'opted_out'

// ─── Local calendar helpers (viewer timezone) ────────────────────────────────

function todayYmdLocal(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addDaysLocal(ymd: string, deltaDays: number): string {
  const [y, m, d] = ymd.split('-').map(Number)
  const dt = new Date(y, m - 1, d + deltaDays)
  const yy = dt.getFullYear()
  const mm = String(dt.getMonth() + 1).padStart(2, '0')
  const dd = String(dt.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

/** Calendar day in the viewer's timezone for an ISO timestamp. */
function messageLocalYmd(sentAt: string | null, createdAt: string): string {
  const d = new Date(sentAt ?? createdAt)
  if (Number.isNaN(d.getTime())) return todayYmdLocal()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatDatePillLocal(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function formatSentTimeLocal(iso: string | null, fallbackIso: string): string {
  const d = new Date(iso ?? fallbackIso)
  if (Number.isNaN(d.getTime())) return iso ?? fallbackIso
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

function FollowUpDatePicker({
  selectedDate,
  onChange,
  minDate,
  maxDate,
}: {
  selectedDate: string
  onChange: (date: string) => void
  minDate?: string
  maxDate?: string
}) {
  const canGoPrev = minDate != null ? selectedDate > minDate : true
  const canGoNext = maxDate != null ? selectedDate < maxDate : true

  return (
    <div className="flex w-full min-w-0 items-center gap-1 sm:w-auto sm:shrink-0">
      <button
        type="button"
        aria-label="Previous day"
        disabled={!canGoPrev}
        onClick={() => canGoPrev && onChange(addDaysLocal(selectedDate, -1))}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-600 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
      >
        <ChevronLeft size={18} aria-hidden />
      </button>
      <div
        className="flex min-w-0 flex-1 items-center justify-center rounded-full border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm font-medium text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800/80 dark:text-white sm:min-w-[5.5rem] sm:flex-none"
        title={selectedDate}
      >
        <span className="truncate">{formatDatePillLocal(selectedDate)}</span>
      </div>
      <button
        type="button"
        aria-label="Next day"
        disabled={!canGoNext}
        onClick={() => canGoNext && onChange(addDaysLocal(selectedDate, 1))}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-600 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
      >
        <ChevronRight size={18} aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => onChange(todayYmdLocal())}
        className="ml-1 shrink-0 rounded-full border border-brand/40 bg-brand/10 px-3 py-2 text-xs font-semibold text-brand transition-colors hover:bg-brand/15 dark:bg-brand/15 dark:hover:bg-brand/25"
      >
        Today
      </button>
    </div>
  )
}

function contactMatchesStatusFilter(c: FollowUpContact, filterId: StatusFilterId): boolean {
  if (filterId === 'all') return true
  if (filterId === 'active') return c.status === 'active'
  if (filterId === 'replied') return c.status === 'replied' || c.status === 'booked'
  if (filterId === 'completed') return c.status === 'completed'
  if (filterId === 'opted_out') return c.status === 'opted_out'
  return true
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; icon: typeof CheckCircle2; className: string }> = {
    active: { label: 'In progress', icon: Clock, className: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200' },
    replied: { label: 'Replied', icon: CheckCircle2, className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200' },
    booked: { label: 'Booked', icon: CheckCircle2, className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200' },
    completed: { label: 'Completed', icon: CheckCircle2, className: 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-200' },
    opted_out: { label: 'Opted out', icon: XCircle, className: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400' },
    failed: { label: 'Failed', icon: AlertCircle, className: 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-200' },
  }
  const s = map[status.toLowerCase()] ?? {
    label: status,
    icon: Clock,
    className: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400',
  }
  const Icon = s.icon
  return (
    <span
      className={clsx(
        'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize',
        s.className
      )}
    >
      <Icon size={10} />
      {s.label}
    </span>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900/80">
      <p className="text-xs text-neutral-500 dark:text-neutral-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-neutral-900 dark:text-white">{value}</p>
    </div>
  )
}

function minPickerYmd(contacts: FollowUpContact[]): string {
  const today = todayYmdLocal()
  let min = today
  for (const c of contacts) {
    if (c.last_sms) {
      const y = messageLocalYmd(c.last_sms.sent_at, c.last_sms.created_at)
      if (y < min) min = y
    }
    if (c.last_email) {
      const y = messageLocalYmd(c.last_email.sent_at, c.last_email.created_at)
      if (y < min) min = y
    }
  }
  return min
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function QuoteFollowUpTab({ contacts }: Props) {
  const [localContacts, setLocalContacts] = useState<FollowUpContact[]>(contacts)
  const [activeFilter, setActiveFilter] = useState<StatusFilterId>('all')
  const [selectedDate, setSelectedDate] = useState<string>(() => todayYmdLocal())
  const [expandedKey, setExpandedKey] = useState<string | null>(null)

  useEffect(() => {
    setLocalContacts(contacts)
  }, [contacts])

  const metrics = useMemo(
    () => ({
      total: localContacts.length,
      inProgress: localContacts.filter((c) => c.status === 'active').length,
      replied: localContacts.filter((c) => c.status === 'replied' || c.status === 'booked').length,
      completed: localContacts.filter((c) => c.status === 'completed').length,
    }),
    [localContacts]
  )

  const statusFiltered = useMemo(
    () => localContacts.filter((c) => contactMatchesStatusFilter(c, activeFilter)),
    [localContacts, activeFilter]
  )

  const smsRows = useMemo(() => {
    const rows = statusFiltered
      .filter(
        (c) =>
          c.last_sms && messageLocalYmd(c.last_sms.sent_at, c.last_sms.created_at) === selectedDate
      )
      .map((c) => ({ contact: c, msg: c.last_sms! }))
    rows.sort(
      (a, b) =>
        new Date(b.msg.sent_at ?? b.msg.created_at).getTime() -
        new Date(a.msg.sent_at ?? a.msg.created_at).getTime()
    )
    return rows
  }, [statusFiltered, selectedDate])

  const emailRows = useMemo(() => {
    const rows = statusFiltered
      .filter(
        (c) =>
          c.last_email &&
          messageLocalYmd(c.last_email.sent_at, c.last_email.created_at) === selectedDate
      )
      .map((c) => ({ contact: c, msg: c.last_email! }))
    rows.sort(
      (a, b) =>
        new Date(b.msg.sent_at ?? b.msg.created_at).getTime() -
        new Date(a.msg.sent_at ?? a.msg.created_at).getTime()
    )
    return rows
  }, [statusFiltered, selectedDate])

  const earliestYmd = useMemo(() => minPickerYmd(localContacts), [localContacts])
  const todayStr = todayYmdLocal()

  const filters: { id: StatusFilterId; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'active', label: 'In Progress' },
    { id: 'replied', label: 'Replied' },
    { id: 'completed', label: 'Completed' },
    { id: 'opted_out', label: 'Opted Out' },
  ]

  if (localContacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-200 py-20 dark:border-neutral-800">
        <MessageSquare className="mb-3 h-10 w-10 text-neutral-300 dark:text-neutral-600" />
        <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">No follow-ups yet</p>
        <p className="mt-1 max-w-sm px-4 text-center text-xs text-neutral-400">
          Contacts will appear here once a campaign is running.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid min-w-0 grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4">
        <MetricCard label="Total Sent" value={String(metrics.total)} />
        <MetricCard label="In Progress" value={String(metrics.inProgress)} />
        <MetricCard label="Replied" value={String(metrics.replied)} />
        <MetricCard label="Completed" value={String(metrics.completed)} />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setActiveFilter(f.id)}
            className={clsx(
              'shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
              activeFilter === f.id
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                : 'border border-neutral-200 text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="w-full min-w-0">
        <FollowUpDatePicker
          selectedDate={selectedDate}
          onChange={setSelectedDate}
          minDate={earliestYmd}
          maxDate={todayStr}
        />
      </div>

      {/* SMS section */}
      <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/80 sm:p-5">
        <div className="mb-4 flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-neutral-500 dark:text-neutral-400" aria-hidden />
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">SMS Follow-ups</h2>
        </div>
        {smsRows.length === 0 ? (
          <p className="py-6 text-center text-xs text-neutral-400 dark:text-neutral-500">
            No SMS messages for this filter and date.
          </p>
        ) : (
          <ul className="space-y-2">
            {smsRows.map(({ contact, msg }) => {
              const displayName = contact.name ?? contact.phone ?? contact.email ?? 'Unknown'
              const rowKey = `sms:${contact.id}:${msg.id}`
              const open = expandedKey === rowKey
              return (
                <li
                  key={rowKey}
                  className="overflow-hidden rounded-xl border border-neutral-100 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950/40"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedKey((k) => (k === rowKey ? null : rowKey))}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-neutral-100/80 dark:hover:bg-neutral-800/50"
                  >
                    <div className="flex min-w-0 max-w-[36%] shrink-0 items-baseline gap-1 sm:max-w-[40%]">
                      <span className="inline-flex min-w-0 max-w-full truncate rounded-full bg-neutral-200/80 px-2.5 py-1 text-xs font-medium text-neutral-800 dark:bg-neutral-700 dark:text-neutral-100">
                        {displayName}
                      </span>
                      {contact.phone && displayName !== contact.phone.trim() && (
                        <span className="shrink-0 text-[11px] text-neutral-400 dark:text-neutral-500">
                          · {contact.phone}
                        </span>
                      )}
                    </div>
                    <p className="min-w-0 flex-1 truncate text-sm text-neutral-700 dark:text-neutral-300">{msg.body}</p>
                    <span className="shrink-0 text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
                      {formatSentTimeLocal(msg.sent_at, msg.created_at)}
                    </span>
                    <StatusBadge status={msg.status} />
                    <ChevronDown
                      size={18}
                      aria-hidden
                      className={clsx(
                        'shrink-0 text-neutral-400 transition-transform duration-200',
                        open && 'rotate-180'
                      )}
                    />
                  </button>
                  {open && (
                    <div className="border-t border-neutral-100 px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap text-neutral-800 dark:border-neutral-800 dark:text-neutral-200">
                      {msg.body}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* Email section */}
      <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/80 sm:p-5">
        <div className="mb-4 flex items-center gap-2">
          <Mail className="h-5 w-5 text-neutral-500 dark:text-neutral-400" aria-hidden />
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">Email Follow-ups</h2>
        </div>
        {emailRows.length === 0 ? (
          <p className="py-6 text-center text-xs text-neutral-400 dark:text-neutral-500">
            No email messages for this filter and date.
          </p>
        ) : (
          <ul className="space-y-2">
            {emailRows.map(({ contact, msg }) => {
              const displayName = contact.name ?? contact.email ?? contact.phone ?? 'Unknown'
              const rowKey = `email:${contact.id}:${msg.id}`
              const open = expandedKey === rowKey
              return (
                <li
                  key={rowKey}
                  className="overflow-hidden rounded-xl border border-neutral-100 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950/40"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedKey((k) => (k === rowKey ? null : rowKey))}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-neutral-100/80 dark:hover:bg-neutral-800/50"
                  >
                    <div className="flex min-w-0 max-w-[36%] shrink-0 items-baseline gap-1 sm:max-w-[40%]">
                      <span className="inline-flex min-w-0 max-w-full truncate rounded-full bg-neutral-200/80 px-2.5 py-1 text-xs font-medium text-neutral-800 dark:bg-neutral-700 dark:text-neutral-100">
                        {displayName}
                      </span>
                      {contact.email && displayName !== contact.email.trim() && (
                        <span className="min-w-0 truncate text-[11px] text-neutral-400 dark:text-neutral-500">
                          · {contact.email}
                        </span>
                      )}
                    </div>
                    <p className="min-w-0 flex-1 truncate text-sm text-neutral-700 dark:text-neutral-300">{msg.body}</p>
                    <span className="shrink-0 text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
                      {formatSentTimeLocal(msg.sent_at, msg.created_at)}
                    </span>
                    <StatusBadge status={msg.status} />
                    <ChevronDown
                      size={18}
                      aria-hidden
                      className={clsx(
                        'shrink-0 text-neutral-400 transition-transform duration-200',
                        open && 'rotate-180'
                      )}
                    />
                  </button>
                  {open && (
                    <div className="border-t border-neutral-100 px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap text-neutral-800 dark:border-neutral-800 dark:text-neutral-200">
                      {msg.body}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
