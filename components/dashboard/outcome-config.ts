import type { CallOutcome } from '@/types'

export const BRAND = '#2E7DFF'

/** Stable order for donut chart and filters */
export const CALL_OUTCOME_ORDER: CallOutcome[] = [
  'booked',
  'booking_deleted',
  'booking_rescheduled',
  'callback_requested',
  'quote_requested',
  'not_a_fit',
  'info_only',
]

export const OUTCOME_CONFIG: Record<
  CallOutcome,
  { label: string; bg: string; text: string; dot: string }
> = {
  booked: {
    label: 'Appointment booked',
    bg: 'bg-emerald-50 dark:bg-emerald-950/50',
    text: 'text-emerald-800 dark:text-emerald-200',
    dot: '#16A34A',
  },
  booking_deleted: {
    label: 'Booking deleted',
    bg: 'bg-red-50 dark:bg-red-950/50',
    text: 'text-red-800 dark:text-red-200',
    dot: '#DC2626',
  },
  booking_rescheduled: {
    label: 'Rescheduled',
    bg: 'bg-violet-50 dark:bg-violet-950/50',
    text: 'text-violet-800 dark:text-violet-200',
    dot: '#7C3AED',
  },
  callback_requested: {
    label: 'Callback requested',
    bg: 'bg-blue-50 dark:bg-blue-950/50',
    text: 'text-blue-800 dark:text-blue-200',
    dot: '#2563EB',
  },
  quote_requested: {
    label: 'Quote requested',
    bg: 'bg-amber-50 dark:bg-amber-950/50',
    text: 'text-amber-900 dark:text-amber-200',
    dot: '#D97706',
  },
  not_a_fit: {
    label: 'Not a fit',
    bg: 'bg-orange-50 dark:bg-orange-950/40',
    text: 'text-orange-800 dark:text-orange-200',
    dot: '#EA580C',
  },
  info_only: {
    label: 'Info only',
    bg: 'bg-neutral-100 dark:bg-neutral-800',
    text: 'text-neutral-600 dark:text-neutral-300',
    dot: '#737373',
  },
}
