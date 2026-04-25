'use client'

import { Fragment, useState } from 'react'
import { Phone, ChevronDown, ChevronUp } from 'lucide-react'
import { clsx } from 'clsx'
import type { NormalisedCall, CallOutcome } from '@/types'
import { OutcomeBadge } from './OutcomeBadge'
import { TranscriptDrawer } from './TranscriptDrawer'

type Props = { calls: NormalisedCall[] }

const FILTER: { value: CallOutcome | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'booked', label: 'Booked' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'not_a_fit', label: 'Not a fit' },
  { value: 'info_only', label: 'Info' },
]

export function ReceptionistCallLog({ calls }: Props) {
  const [openCallId, setOpenCallId] = useState<string | null>(null)
  const [filter, setFilter] = useState<CallOutcome | 'all'>('all')

  const filteredCalls = filter === 'all' ? calls : calls.filter((c) => c.outcome === filter)

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900/80">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium text-neutral-900 dark:text-white">Recent calls</p>
        <div className="flex min-h-[44px] flex-wrap items-center gap-1 rounded-lg bg-neutral-100 p-1 dark:bg-neutral-800">
          {FILTER.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={clsx(
                'rounded-md px-2.5 py-1.5 text-xs font-medium transition-all sm:py-1',
                filter === f.value
                  ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-950 dark:text-white'
                  : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="-mx-1 overflow-x-auto">
        {filteredCalls.length === 0 ? (
          <div className="py-12 text-center">
            <Phone size={24} className="mx-auto mb-2 text-neutral-300 dark:text-neutral-600" />
            <p className="text-sm text-neutral-400">
              {calls.length === 0 ? 'No calls yet' : 'No calls match this filter'}
            </p>
          </div>
        ) : (
          <table className="w-full min-w-[640px] table-fixed border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-100 dark:border-neutral-800">
                <th
                  scope="col"
                  className="w-[100px] pb-3 pl-1 pr-2 text-[11px] font-medium uppercase tracking-wide text-neutral-400"
                >
                  Date
                </th>
                <th
                  scope="col"
                  className="min-w-0 pb-3 pr-2 text-[11px] font-medium uppercase tracking-wide text-neutral-400"
                >
                  Caller
                </th>
                <th
                  scope="col"
                  className="w-[80px] pb-3 pr-2 text-[11px] font-medium uppercase tracking-wide text-neutral-400"
                >
                  Duration
                </th>
                <th
                  scope="col"
                  className="w-[150px] pb-3 pr-2 text-[11px] font-medium uppercase tracking-wide text-neutral-400"
                >
                  Outcome
                </th>
                <th scope="col" className="w-9 pb-3 pr-1 text-right text-[11px] font-medium text-neutral-400" aria-label="Row actions">
                  <span className="sr-only">Toggle</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredCalls.map((call) => (
                <Fragment key={call.id}>
                  <tr
                    className="group cursor-pointer border-b border-neutral-100 last:border-0 dark:border-neutral-800/80"
                    onClick={() => setOpenCallId(openCallId === call.id ? null : call.id)}
                  >
                    <td className="whitespace-nowrap align-middle py-3.5 pl-1 pr-2 text-xs text-neutral-400">
                      {call.date}
                    </td>
                    <td className="min-w-0 align-middle py-3.5 pr-2">
                      <div className="truncate text-sm text-neutral-900 group-hover:underline dark:text-neutral-100">
                        {call.callerName ?? call.callerNumber}
                      </div>
                    </td>
                    <td className="whitespace-nowrap align-middle pr-2 text-xs text-neutral-400">
                      {call.durationFormatted}
                    </td>
                    <td className="align-middle pr-2">
                      <OutcomeBadge outcome={call.outcome} />
                    </td>
                    <td className="align-middle pr-1 text-right text-neutral-400" aria-hidden>
                      {openCallId === call.id ? <ChevronUp size={14} className="ml-auto" /> : <ChevronDown size={14} className="ml-auto" />}
                    </td>
                  </tr>
                  {openCallId === call.id && (
                    <tr className="border-b border-neutral-100 dark:border-neutral-800/80">
                      <td colSpan={5} className="p-0">
                        <div className="border-t border-neutral-100 bg-neutral-50/50 px-1 py-3 dark:border-neutral-800 dark:bg-neutral-950/30 sm:px-2">
                          <TranscriptDrawer call={call} onClose={() => setOpenCallId(null)} />
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
