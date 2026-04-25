import { format, parseISO } from 'date-fns'
import { Star } from 'lucide-react'
import type { StoredReview } from '@/types'

type Props = { reviews: StoredReview[] }

function formatTime(iso: string) {
  try {
    return format(parseISO(iso), 'MMM d, yyyy h:mm a')
  } catch {
    return iso
  }
}

export function ReviewsTab({ reviews }: Props) {
  if (reviews.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-200 py-20 dark:border-neutral-800">
        <Star className="mb-3 h-10 w-10 text-neutral-300 dark:text-neutral-600" />
        <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">No reviews captured yet</p>
        <p className="mt-1 max-w-sm px-4 text-center text-xs text-neutral-400">
          Connect your N8N workflow to the reviews webhook to sync feedback here.
        </p>
      </div>
    )
  }

  return (
    <ul className="space-y-3">
      {reviews.map((r) => (
        <li
          key={r.id}
          className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900/80"
        >
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-neutral-900 dark:text-white">
                {r.data.author ?? 'Anonymous'}
              </p>
              {r.data.rating != null && !Number.isNaN(r.data.rating) && (
                <span
                  className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
                >
                  {Math.min(5, Math.max(0, Math.round(r.data.rating)))}/5
                </span>
              )}
            </div>
            <time className="text-xs text-neutral-400" dateTime={r.receivedAt}>
              {formatTime(r.receivedAt)}
            </time>
          </div>
          {r.data.platform && (
            <p className="mb-2 text-xs uppercase tracking-wide text-brand">{r.data.platform}</p>
          )}
          {r.data.text && <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-200">{r.data.text}</p>}
          {r.data.link && (
            <a
              href={r.data.link}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-xs text-brand hover:underline"
            >
              View source
            </a>
          )}
        </li>
      ))}
    </ul>
  )
}
