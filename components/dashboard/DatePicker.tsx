'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

/** YYYY-MM-DD in UTC (matches `NormalisedCall.dateISO` / Retell-style day keys). */
export function todayYmdUtc(): string {
  return new Date().toISOString().slice(0, 10)
}

export function addDaysYmdUtc(ymd: string, deltaDays: number): string {
  const [y, m, d] = ymd.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + deltaDays))
  return dt.toISOString().slice(0, 10)
}

function formatDatePill(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

export type DatePickerProps = {
  selectedDate: string
  onChange: (date: string) => void
  minDate?: string
  maxDate?: string
}

/**
 * Date carousel: prev / next day, pill label, Today.
 * On mobile use `className="w-full"` on the wrapper for full width.
 */
export function DatePicker({ selectedDate, onChange, minDate, maxDate }: DatePickerProps) {
  const canGoPrev = minDate != null ? selectedDate > minDate : true
  const canGoNext = maxDate != null ? selectedDate < maxDate : true

  return (
    <div className="flex w-full min-w-0 items-center gap-1 sm:w-auto sm:shrink-0">
      <button
        type="button"
        aria-label="Previous day"
        disabled={!canGoPrev}
        onClick={() => canGoPrev && onChange(addDaysYmdUtc(selectedDate, -1))}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-600 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
      >
        <ChevronLeft size={18} aria-hidden />
      </button>
      <div
        className="flex min-w-0 flex-1 items-center justify-center rounded-full border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm font-medium text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800/80 dark:text-white sm:min-w-[5.5rem] sm:flex-none"
        title={selectedDate}
      >
        <span className="truncate">{formatDatePill(selectedDate)}</span>
      </div>
      <button
        type="button"
        aria-label="Next day"
        disabled={!canGoNext}
        onClick={() => canGoNext && onChange(addDaysYmdUtc(selectedDate, 1))}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-600 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
      >
        <ChevronRight size={18} aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => onChange(todayYmdUtc())}
        className="ml-1 shrink-0 rounded-full border border-brand/40 bg-brand/10 px-3 py-2 text-xs font-semibold text-brand transition-colors hover:bg-brand/15 dark:bg-brand/15 dark:hover:bg-brand/25"
      >
        Today
      </button>
    </div>
  )
}
