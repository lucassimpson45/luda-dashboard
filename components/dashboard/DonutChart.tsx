import type { DashboardStats } from '@/types'
import { BRAND } from './outcome-config'

export function DonutChart({ stats }: { stats: DashboardStats }) {
  const { booked, qualified, not_a_fit, info_only } = stats.outcomeBreakdown
  const total = stats.totalCalls || 1

  const slices = [
    [booked,    BRAND,   'Booked'],
    [qualified, '#0EA5E9', 'Qualified'],
    [not_a_fit, '#EA580C', 'Not a fit'],
    [info_only, '#737373', 'Info only'],
  ] as [number, string, string][]

  const r = 38
  const circ = 2 * Math.PI * r
  let offset = 0

  return (
    <div className="flex items-center gap-6">
      <svg width={100} height={100} viewBox="0 0 100 100" className="shrink-0">
        <circle cx={50} cy={50} r={r} fill="none" className="stroke-neutral-200 dark:stroke-neutral-800" strokeWidth={14} />
        {slices.map(([val, color], i) => {
          const dash = (val / total) * circ
          const currentOffset = offset
          offset += dash
          return (
            <circle
              key={i}
              cx={50} cy={50} r={r}
              fill="none"
              stroke={color}
              strokeWidth={14}
              strokeDasharray={`${dash} ${circ}`}
              strokeDashoffset={-currentOffset}
              transform="rotate(-90 50 50)"
            />
          )
        })}
        <text x={50} y={46} textAnchor="middle" className="fill-neutral-900 dark:fill-white" fontSize={15} fontWeight={600}>
          {stats.totalCalls}
        </text>
        <text x={50} y={59} textAnchor="middle" className="fill-neutral-500 dark:fill-neutral-400" fontSize={9}>
          calls
        </text>
      </svg>

      <div className="flex flex-col gap-2">
        {slices.map(([val, color, label]) => (
          <div key={label} className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
            <div className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
            {label} — {val}
          </div>
        ))}
      </div>
    </div>
  )
}
