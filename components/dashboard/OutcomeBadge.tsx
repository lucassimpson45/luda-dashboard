import { clsx } from 'clsx'
import type { CallOutcome } from '@/types'
import { OUTCOME_CONFIG } from './outcome-config'

export function OutcomeBadge({ outcome }: { outcome: CallOutcome }) {
  const cfg = OUTCOME_CONFIG[outcome] ?? OUTCOME_CONFIG.info_only
  return (
    <span className={clsx('rounded-full px-2.5 py-1 text-xs font-medium', cfg.bg, cfg.text)}>
      {cfg.label}
    </span>
  )
}
