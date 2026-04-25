import { Phone } from 'lucide-react'
import { clsx } from 'clsx'
import type { NormalisedCall } from '@/types'
import { OutcomeBadge } from './OutcomeBadge'

type Props = { calls: NormalisedCall[]; error: string | null }

export function OutboundTab({ calls, error }: Props) {
  if (error) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
        <strong>Outbound data unavailable.</strong> {error}
      </div>
    )
  }

  if (calls.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-200 py-20 dark:border-neutral-800">
        <Phone className="mb-3 h-10 w-10 text-neutral-300 dark:text-neutral-600" />
        <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">No outbound calls yet</p>
        <p className="mt-1 max-w-sm px-4 text-center text-xs text-neutral-400">
          Ended calls from your outbound Retell agent appear here.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900/80">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-neutral-200 dark:border-neutral-800">
            <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-neutral-400">Date</th>
            <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-neutral-400">Direction</th>
            <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-neutral-400">To / from</th>
            <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-neutral-400">Duration</th>
            <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-neutral-400">Outcome</th>
          </tr>
        </thead>
        <tbody>
          {calls.map((c) => (
            <tr key={c.id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800/80">
              <td className="px-4 py-3 text-xs text-neutral-400">{c.date}</td>
              <td className="px-4 py-3">
                <span
                  className={clsx(
                    'inline-flex rounded-md px-2 py-0.5 text-xs font-medium',
                    c.callType === 'outbound'
                      ? 'bg-brand/10 text-brand'
                      : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300'
                  )}
                >
                  {c.callType}
                </span>
              </td>
              <td className="max-w-[200px] truncate px-4 py-3 text-neutral-900 dark:text-neutral-100">
                {c.callerName ?? c.callerNumber}
              </td>
              <td className="px-4 py-3 text-xs text-neutral-400">{c.durationFormatted}</td>
              <td className="px-4 py-3">
                <OutcomeBadge outcome={c.outcome} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
