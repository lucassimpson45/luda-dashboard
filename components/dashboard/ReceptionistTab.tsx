import type { NormalisedCall, DashboardStats } from '@/types'
import { ReceptionistOverview } from './ReceptionistOverview'
import { ReceptionistCallLog } from './ReceptionistCallLog'

type Props = {
  calls: NormalisedCall[]
  stats: DashboardStats | null
  error: string | null
}

export function ReceptionistTab({ calls, stats, error }: Props) {
  return (
    <div>
      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300">
          <strong>Connection error:</strong> {error}
        </div>
      )}

      {stats && <ReceptionistOverview stats={stats} />}

      <ReceptionistCallLog calls={calls} />
    </div>
  )
}
