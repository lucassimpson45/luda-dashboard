import { format, parseISO } from 'date-fns'
import { FileText } from 'lucide-react'
import type { StoredQuote } from '@/types'

type Props = { quotes: StoredQuote[] }

function formatTime(iso: string) {
  try {
    return format(parseISO(iso), 'MMM d, yyyy h:mm a')
  } catch {
    return iso
  }
}

export function QuoteFollowUpTab({ quotes }: Props) {
  if (quotes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-200 py-20 dark:border-neutral-800">
        <FileText className="mb-3 h-10 w-10 text-neutral-300 dark:text-neutral-600" />
        <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">No quote follow-ups yet</p>
        <p className="mt-1 max-w-sm px-4 text-center text-xs text-neutral-400">
          N8N will post here when a lead needs a follow-up. Configure the webhook in your workflow.
        </p>
      </div>
    )
  }

  return (
    <ul className="space-y-3">
      {quotes.map((q) => (
        <li
          key={q.id}
          className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900/80"
        >
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-medium text-neutral-900 dark:text-white">
              {q.data.lead_name ?? q.data.company ?? 'Lead'}
            </p>
            <time className="text-xs text-neutral-400" dateTime={q.receivedAt}>
              {formatTime(q.receivedAt)}
            </time>
          </div>
          <div className="space-y-1 text-sm text-neutral-600 dark:text-neutral-300">
            {q.data.company && <p>Company: {q.data.company}</p>}
            {q.data.status && <p>Status: {q.data.status}</p>}
            {q.data.quote_value && <p>Value: {q.data.quote_value}</p>}
            {q.data.email && <p>Email: {q.data.email}</p>}
            {q.data.phone && <p>Phone: {q.data.phone}</p>}
            {q.data.notes && <p className="whitespace-pre-wrap">Notes: {q.data.notes}</p>}
          </div>
          {q.extra && Object.keys(q.extra).length > 0 && (
            <details className="mt-3 text-xs text-neutral-400">
              <summary className="cursor-pointer">Raw fields</summary>
              <pre className="mt-1 overflow-x-auto rounded bg-neutral-100 p-2 dark:bg-neutral-950">
                {JSON.stringify(q.extra, null, 2)}
              </pre>
            </details>
          )}
        </li>
      ))}
    </ul>
  )
}
