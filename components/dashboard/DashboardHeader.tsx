import { RefreshCw, LogOut } from 'lucide-react'
import { LudaLogo } from '@/components/brand/LudaLogo'
import { ThemeToggle } from '@/components/brand/ThemeToggle'

type Props = {
  refreshing: boolean
  onRefresh: () => void
  onLogout: () => void
}

export function DashboardHeader({ refreshing, onRefresh, onLogout }: Props) {
  return (
    <>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
          <LudaLogo height={40} className="max-w-[200px] sm:max-w-none" />
          <span className="rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
            Client portal
          </span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden items-center gap-1.5 text-xs text-brand sm:flex">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" />
            Live
          </div>
          <ThemeToggle />
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="rounded-lg border border-transparent p-2 text-neutral-400 transition-all hover:border-neutral-200 hover:bg-white hover:text-neutral-600 disabled:opacity-50 dark:hover:border-neutral-800 dark:hover:bg-neutral-900 dark:hover:text-neutral-200"
            title="Refresh all data"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="rounded-lg border border-transparent p-2 text-neutral-400 transition-all hover:border-neutral-200 hover:bg-white hover:text-neutral-600 dark:hover:border-neutral-800 dark:hover:bg-neutral-900 dark:hover:text-neutral-200"
            title="Sign out"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-1.5 text-xs text-brand sm:hidden">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" />
        Data syncs every 60s
      </div>
    </>
  )
}
