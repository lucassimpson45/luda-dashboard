import { clsx } from 'clsx'

export function MetricCard({
  label, value, sub, subPositive
}: { label: string; value: string; sub?: string; subPositive?: boolean }) {
  return (
    <div className="rounded-xl bg-neutral-100 p-4 dark:bg-neutral-800/80">
      <p className="mb-1.5 text-xs text-neutral-500 dark:text-neutral-400">{label}</p>
      <p className="text-2xl font-semibold text-neutral-900 dark:text-white">{value}</p>
      {sub && (
        <p className={clsx('mt-1 text-xs', subPositive ? 'text-brand' : 'text-neutral-400 dark:text-neutral-500')}>
          {sub}
        </p>
      )}
    </div>
  )
}
