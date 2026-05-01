'use client'

import { Fragment, useState, useCallback, useMemo, useEffect } from 'react'
import { Phone, ChevronDown, ChevronUp, Download } from 'lucide-react'
import { clsx } from 'clsx'
import type { NormalisedCall, CallOutcome } from '@/types'
import { callerDisplayLine } from '@/lib/retell'
import { CALL_OUTCOME_ORDER } from './outcome-config'
import { OutcomeBadge } from './OutcomeBadge'
import { TranscriptDrawer } from './TranscriptDrawer'
import { DatePicker, todayYmdUtc } from './DatePicker'

type Props = { calls: NormalisedCall[] }

const FILTER_SHORT_LABEL: Record<CallOutcome, string> = {
  booked: 'Booked',
  booking_deleted: 'Deleted',
  booking_rescheduled: 'Resched.',
  callback_requested: 'Callback',
  quote_requested: 'Quote',
  not_a_fit: 'Not a fit',
  info_only: 'Info',
}

const FILTER_TABS: { value: CallOutcome | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  ...CALL_OUTCOME_ORDER.map((value) => ({
    value,
    label: FILTER_SHORT_LABEL[value],
  })),
]

function escapeCsvCell(value: string): string {
  const s = value.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function buildCallsCsv(rows: NormalisedCall[]): string {
  const header = ['Date', 'Caller Name', 'Phone', 'Duration', 'Outcome', 'Summary']
  const lines = [
    header.map(escapeCsvCell).join(','),
    ...rows.map((c) =>
      [
        c.date,
        c.callerName ?? '',
        c.callerNumber,
        c.durationFormatted,
        c.outcomeLabel,
        c.summary,
      ]
        .map((cell) => escapeCsvCell(String(cell)))
        .join(',')
    ),
  ]
  return lines.join('\r\n')
}

function minCallYmdUtc(calls: NormalisedCall[]): string {
  if (calls.length === 0) return todayYmdUtc()
  return calls.reduce((min, c) => (c.dateISO < min ? c.dateISO : min), calls[0].dateISO)
}

export function ReceptionistCallLog({ calls }: Props) {
  const [openCallId, setOpenCallId] = useState<string | null>(null)
  const [filter, setFilter] = useState<CallOutcome | 'all'>('all')
  const [selectedDate, setSelectedDate] = useState<string>(() => todayYmdUtc())

  const todayStr = todayYmdUtc()
  const earliestStr = useMemo(() => minCallYmdUtc(calls), [calls])

  useEffect(() => {
    setOpenCallId(null)
  }, [selectedDate])

  const callsOnDate = useMemo(
    () => calls.filter((c) => c.dateISO === selectedDate),
    [calls, selectedDate]
  )

  const filteredCalls = useMemo(
    () => (filter === 'all' ? callsOnDate : callsOnDate.filter((c) => c.outcome === filter)),
    [callsOnDate, filter]
  )

  const exportCsv = useCallback(() => {
    const csv = buildCallsCsv(filteredCalls)
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `receptionist-calls-${selectedDate}.csv`
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }, [filteredCalls, selectedDate])

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900/80">
      <div className="mb-4 flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <p className="text-sm font-medium text-neutral-900 dark:text-white">Recent calls</p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
          <div className="w-full min-w-0 sm:w-auto sm:shrink-0">
            <DatePicker
              selectedDate={selectedDate}
              onChange={setSelectedDate}
              minDate={earliestStr}
              maxDate={todayStr}
            />
          </div>

          <div className="flex min-w-0 flex-wrap items-center gap-2 sm:ml-auto sm:flex-1 sm:justify-end">
            <div className="flex min-h-[44px] min-w-0 flex-1 flex-wrap items-center gap-1 rounded-lg bg-neutral-100 p-1 dark:bg-neutral-800 sm:flex-initial">
              {FILTER_TABS.map((f) => (
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
            <button
              type="button"
              onClick={exportCsv}
              disabled={filteredCalls.length === 0}
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
            >
              <Download size={14} aria-hidden />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      <div className="-mx-1 overflow-x-auto">
        {filteredCalls.length === 0 ? (
          <div className="py-12 text-center">
            <Phone size={24} className="mx-auto mb-2 text-neutral-300 dark:text-neutral-600" />
            <p className="text-sm text-neutral-400">
              {calls.length === 0
                ? 'No calls yet'
                : callsOnDate.length === 0
                  ? 'No calls on this date.'
                  : 'No calls match this filter'}
            </p>
          </div>
        ) : (
          <table className="w-full min-w-0 table-fixed border-separate border-spacing-0 text-left text-sm sm:min-w-[640px]">
            <thead>
              <tr className="border-b border-neutral-100 dark:border-neutral-800">
                <th
                  scope="col"
                  className="hidden w-[100px] pb-3 pl-1 pr-2 text-[11px] font-medium uppercase tracking-wide text-neutral-400 sm:table-cell"
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
                  className="hidden w-[80px] pb-3 pr-2 text-[11px] font-medium uppercase tracking-wide text-neutral-400 sm:table-cell"
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
                    <td className="hidden whitespace-nowrap align-middle py-3.5 pl-1 pr-2 text-xs text-neutral-400 sm:table-cell">
                      {call.date}
                    </td>
                    <td className="min-w-0 align-middle py-3.5 pr-2">
                      <p className="mb-1 text-xs text-neutral-400 sm:hidden">{call.date}</p>
                      <div className="flex min-w-0 items-center gap-2">
                        <div className="min-w-0 flex-1 truncate text-sm text-neutral-900 group-hover:underline dark:text-neutral-100">
                          {callerDisplayLine(call)}
                        </div>
                        {call.failed && (
                          <span className="shrink-0 rounded-md bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-700 dark:bg-red-950/80 dark:text-red-300">
                            Missed
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="hidden whitespace-nowrap align-middle pr-2 text-xs text-neutral-400 sm:table-cell">
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
