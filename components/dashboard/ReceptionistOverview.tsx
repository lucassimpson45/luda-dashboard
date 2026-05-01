import { formatDuration } from '@/lib/retell'
import type { DashboardStats } from '@/types'
import { MetricCard } from './MetricCard'
import { DonutChart } from './DonutChart'

type Props = { stats: DashboardStats }

export function ReceptionistOverview({ stats }: Props) {
  const avgDurFormatted = formatDuration(stats.avgDurationSeconds * 1000)
  const barMax = Math.max(...stats.callsByDay.map((d) => d.count), 1)

  return (
    <>
      <div className="mb-5 grid min-w-0 grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4">
        <MetricCard
          label="Calls this month"
          value={String(stats.totalCalls)}
          sub={stats.totalCallsChange >= 0 ? `+${stats.totalCallsChange} vs last month` : `${stats.totalCallsChange} vs last month`}
          subPositive={stats.totalCallsChange >= 0}
        />
        <MetricCard
          label="Appointments booked"
          value={String(stats.appointmentsBooked)}
          sub={`${stats.bookingRate}% booking rate`}
          subPositive
        />
        <MetricCard
          label="Avg call duration"
          value={avgDurFormatted}
          sub="min:sec"
        />
        <MetricCard
          label="Quotes requested"
          value={String(stats.quotesRequested)}
          sub={`${stats.quoteRate}% of all calls`}
          subPositive
        />
      </div>

      <div className="mb-5 grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900/80">
          <p className="mb-4 text-sm font-medium text-neutral-900 dark:text-white">Calls by day of week</p>
          <div className="flex flex-col gap-2">
            {stats.callsByDay.map(({ day, count }) => (
              <div key={day} className="flex items-center gap-3">
                <span className="w-7 text-right text-xs text-neutral-400">{day}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                  <div
                    className="h-full rounded-full bg-brand transition-all duration-700"
                    style={{ width: `${Math.round((count / barMax) * 100)}%` }}
                  />
                </div>
                <span className="w-5 text-xs text-neutral-400">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900/80">
          <p className="mb-4 text-sm font-medium text-neutral-900 dark:text-white">Call outcomes</p>
          <DonutChart stats={stats} />
        </div>
      </div>
    </>
  )
}
