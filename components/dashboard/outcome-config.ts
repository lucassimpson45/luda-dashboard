import type { CallOutcome } from '@/types'

export const BRAND = '#2E7DFF'

export const OUTCOME_CONFIG: Record<CallOutcome, { label: string; bg: string; text: string; dot: string }> = {
  booked: {
    label: 'Appointment booked',
    bg: 'bg-blue-50 dark:bg-blue-950/50',
    text: 'text-blue-800 dark:text-blue-200',
    dot: BRAND,
  },
  qualified: {
    label: 'Lead qualified',
    bg: 'bg-sky-50 dark:bg-sky-950/50',
    text: 'text-sky-800 dark:text-sky-200',
    dot: '#0EA5E9',
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
