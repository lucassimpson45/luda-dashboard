import Image from 'next/image'
import { RefreshCw, LogOut } from 'lucide-react'
import { ThemeToggle } from '@/components/brand/ThemeToggle'

type Props = {
  refreshing: boolean
  onRefresh: () => void
  onLogout: () => void
  businessName: string
  /** Public path (e.g. `/client-logo.png`) or absolute image URL */
  logoUrl: string | null
}

export function DashboardHeader({
  refreshing,
  onRefresh,
  onLogout,
  businessName,
  logoUrl,
}: Props) {
  const displayLogo = (logoUrl && logoUrl.trim()) || '/client-logo.png'
  const isRemote = /^https?:\/\//i.test(displayLogo)

  return (
    <>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
          <Image
            src="/luda-ai-logo.png"
            alt="Luda AI"
            width={560}
            height={140}
            className="h-auto max-h-10 w-auto max-w-[200px] shrink-0 object-contain sm:max-w-none"
          />
          <div className="flex min-w-0 max-w-full items-center gap-2 rounded-full border border-neutral-200 bg-white py-1 pl-1 pr-3 dark:border-neutral-800 dark:bg-neutral-900">
            {isRemote ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={displayLogo}
                alt={businessName}
                width={32}
                height={32}
                className="h-8 w-8 shrink-0 rounded-full object-cover"
              />
            ) : (
              <Image
                src={displayLogo}
                alt={businessName}
                width={32}
                height={32}
                className="shrink-0 rounded-full object-cover"
              />
            )}
            <span className="truncate text-sm font-semibold text-neutral-900 dark:text-white">
              {businessName}
            </span>
          </div>
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
