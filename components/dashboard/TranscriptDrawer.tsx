import { X, Mic } from 'lucide-react'
import { clsx } from 'clsx'
import type { NormalisedCall } from '@/types'
import { callerDisplayLine } from '@/lib/retell'
import { OutcomeBadge } from './OutcomeBadge'

type Props = { call: NormalisedCall; onClose: () => void }

export function TranscriptDrawer({ call, onClose }: Props) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900/80">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
            {callerDisplayLine(call)}
          </h3>
          <div className="mt-1 flex items-center gap-3">
            <span className="text-xs text-neutral-400">{call.date}</span>
            <span className="text-xs text-neutral-400">·</span>
            <span className="text-xs text-neutral-400">{call.durationFormatted}</span>
            <span className="text-xs text-neutral-400">·</span>
            <span className="text-xs text-neutral-400">{call.sentiment} sentiment</span>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 text-neutral-400 transition-colors hover:text-neutral-600 dark:hover:text-neutral-300"
        >
          <X size={16} />
        </button>
      </div>

      {call.transcript && call.transcript.length > 0 ? (
        <div className="mb-4 flex max-h-72 flex-col gap-2.5 overflow-y-auto pr-1">
          {call.transcript.map((turn, i) => (
            <div
              key={i}
              className={clsx('flex flex-col', turn.role === 'agent' ? 'items-start' : 'items-end')}
            >
              <span className="mb-1 px-1 text-[10px] font-medium text-neutral-400">
                {turn.role === 'agent' ? 'AI Receptionist' : 'Caller'}
              </span>
              <div
                className={clsx(
                  'max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                  turn.role === 'agent'
                    ? 'rounded-tl-sm bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-100'
                    : 'rounded-tr-sm border border-blue-200/50 bg-blue-50 text-blue-950 dark:border-blue-500/20 dark:bg-blue-950/40 dark:text-blue-100'
                )}
              >
                {turn.content}
              </div>
            </div>
          ))}
        </div>
      ) : call.rawTranscript ? (
        <div className="mb-4 max-h-48 overflow-y-auto rounded-xl bg-neutral-50 p-3 dark:bg-neutral-950/50">
          <p className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-neutral-600 dark:text-neutral-300">
            {call.rawTranscript}
          </p>
        </div>
      ) : (
        <p className="mb-4 text-sm italic text-neutral-400">No transcript available</p>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-neutral-100 pt-3 dark:border-neutral-800">
        <OutcomeBadge outcome={call.outcome} />
        <p className="min-w-0 flex-1 text-xs text-neutral-500 dark:text-neutral-400">{call.summary}</p>
        {call.recordingUrl && (
          <a
            href={call.recordingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-brand hover:underline"
          >
            <Mic size={12} /> Listen
          </a>
        )}
      </div>
    </div>
  )
}
