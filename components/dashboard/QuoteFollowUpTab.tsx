'use client'

import { useEffect, useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { MessageSquare, Mail, CheckCircle2, Clock, XCircle, AlertCircle } from 'lucide-react'
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string | null) {
  if (!iso) return '—'
  try { return format(parseISO(iso), 'MMM d, h:mm a') } catch { return iso }
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; icon: typeof CheckCircle2; className: string }> = {
    active:    { label: 'In progress', icon: Clock,         className: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200' },
    replied:   { label: 'Replied',     icon: CheckCircle2,  className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200' },
    booked:    { label: 'Booked',      icon: CheckCircle2,  className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200' },
    completed: { label: 'Completed',   icon: CheckCircle2,  className: 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-200' },
    opted_out: { label: 'Opted out',   icon: XCircle,       className: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400' },
    failed:    { label: 'Failed',      icon: AlertCircle,   className: 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-200' },
  }
  const s = map[status] ?? { label: status, icon: Clock, className: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400' }
  const Icon = s.icon
  return (
    <span className={clsx('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium', s.className)}>
      <Icon size={11} />
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

function ContactCard({ contact }: { contact: FollowUpContact }) {
  const [expanded, setExpanded] = useState(false)
  const name = contact.name ?? contact.phone ?? contact.email ?? 'Unknown'
  const meta = contact.metadata ?? {}

  return (
    <li className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900/80">
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-neutral-900 dark:text-white">{name}</h3>
            {meta.job_type && (
              <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
                {meta.job_type}
                {meta.quote_amount && <span className="ml-2 font-medium text-neutral-700 dark:text-neutral-300">${meta.quote_amount}</span>}
              </p>
            )}
          </div>
          <StatusBadge status={contact.status} />
        </div>

        {/* Channel rows */}
        <div className="mt-4 space-y-3">
          {/* SMS row */}
          <div className="flex items-center gap-3 rounded-xl border border-neutral-100 bg-neutral-50 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-950/40">
            <MessageSquare size={15} className="shrink-0 text-neutral-400" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
                  SMS {contact.phone ? `· ${contact.phone}` : ''}
                </span>
                <span className="text-xs text-neutral-400">{contact.sms_count} sent</span>
              </div>
              {contact.last_sms ? (
                <p className="mt-0.5 truncate text-xs text-neutral-500 dark:text-neutral-400">
                  Last: {formatDate(contact.last_sms.sent_at ?? contact.last_sms.created_at)}
                  <span className="ml-2 capitalize">· {contact.last_sms.status}</span>
                </p>
              ) : (
                <p className="mt-0.5 text-xs text-neutral-400">No SMS sent yet</p>
              )}
            </div>
          </div>

          {/* Email row */}
          <div className="flex items-center gap-3 rounded-xl border border-neutral-100 bg-neutral-50 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-950/40">
            <Mail size={15} className="shrink-0 text-neutral-400" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
                  Email {contact.email ? `· ${contact.email}` : ''}
                </span>
                <span className="text-xs text-neutral-400">{contact.email_count} sent</span>
              </div>
              {contact.last_email ? (
                <p className="mt-0.5 truncate text-xs text-neutral-500 dark:text-neutral-400">
                  Last: {formatDate(contact.last_email.sent_at ?? contact.last_email.created_at)}
                  <span className="ml-2 capitalize">· {contact.last_email.status}</span>
                </p>
              ) : (
                <p className="mt-0.5 text-xs text-neutral-400">No email sent yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Last message preview toggle */}
        {contact.last_sms?.body && (
          <div className="mt-3 border-t border-neutral-100 pt-3 dark:border-neutral-800">
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
            >
              {expanded ? 'Hide message ↑' : 'Show last message ↓'}
            </button>
            {expanded && (
              <p className="mt-2 rounded-lg bg-neutral-50 px-4 py-3 text-xs leading-relaxed text-neutral-700 dark:bg-neutral-950 dark:text-neutral-300">
                {contact.last_sms.body}
              </p>
            )}
          </div>
        )}
      </div>
    </li>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function QuoteFollowUpTab({ contacts }: Props) {
  const [localContacts, setLocalContacts] = useState<FollowUpContact[]>(contacts)
  const [activeFilter, setActiveFilter] = useState<string>('all')

  useEffect(() => { setLocalContacts(contacts) }, [contacts])

  const metrics = useMemo(() => ({
    total:     localContacts.length,
    active:    localContacts.filter((c) => c.status === 'active').length,
    replied:   localContacts.filter((c) => c.status === 'replied' || c.status === 'booked').length,
    completed: localContacts.filter((c) => c.status === 'completed').length,
  }), [localContacts])

  const filtered = useMemo(() => {
    if (activeFilter === 'all') return localContacts
    return localContacts.filter((c) => c.status === activeFilter)
  }, [localContacts, activeFilter])

  const filters = [
    { id: 'all',       label: 'All' },
    { id: 'active',    label: 'In Progress' },
    { id: 'replied',   label: 'Replied' },
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
      {/* Metrics */}
      <div className="grid min-w-0 grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4">
        <MetricCard label="Total sent"  value={String(metrics.total)} />
        <MetricCard label="In progress" value={String(metrics.active)} />
        <MetricCard label="Replied"     value={String(metrics.replied)} />
        <MetricCard label="Completed"   value={String(metrics.completed)} />
      </div>

      {/* Filters */}
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

      {/* Contact list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-200 py-16 dark:border-neutral-800">
          <p className="text-sm text-neutral-400">No contacts with this status</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {filtered.map((contact) => (
            <ContactCard key={contact.id} contact={contact} />
          ))}
        </ul>
      )}
    </div>
  )
}
