'use client'

import { Plus, Trash2 } from 'lucide-react'
import type { CampaignForm } from '@/lib/admin-onboard-types'
import { newStepId } from '@/lib/admin-onboard-types'

export const adminInputClass =
  'w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none ring-brand focus:ring-2 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white'
export const adminLabelClass =
  'mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300'

export function AdminToggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-neutral-200 px-3 py-2.5 dark:border-neutral-700">
      <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-brand' : 'bg-neutral-300 dark:bg-neutral-600'
        }`}
      >
        <span
          className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
            checked ? 'left-5' : 'left-0.5'
          }`}
        />
      </button>
    </label>
  )
}

export function CampaignEditor({
  title,
  value,
  onChange,
}: {
  title: string
  value: CampaignForm
  onChange: (next: CampaignForm) => void
}) {
  const updateStep = (i: number, patch: Partial<CampaignForm['steps'][0]>) => {
    const steps = value.steps.map((s, j) => (j === i ? { ...s, ...patch } : s))
    onChange({ ...value, steps })
  }

  const addStep = () => {
    onChange({
      ...value,
      steps: [
        ...value.steps,
        { id: newStepId(), delayHours: 24, smsTemplate: '', emailTemplate: '' },
      ],
    })
  }

  const removeStep = (i: number) => {
    if (value.steps.length <= 1) return
    onChange({ ...value, steps: value.steps.filter((_, j) => j !== i) })
  }

  return (
    <div className="space-y-4 rounded-xl border border-neutral-200 p-4 dark:border-neutral-700">
      <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">{title}</h3>

      <div>
        <label className={adminLabelClass}>Channel</label>
        <select
          className={adminInputClass}
          value={value.channel}
          onChange={(e) =>
            onChange({
              ...value,
              channel: e.target.value as CampaignForm['channel'],
            })
          }
        >
          <option value="sms">SMS</option>
          <option value="email">Email</option>
          <option value="both">Both</option>
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={adminLabelClass}>Send window start</label>
          <input
            type="time"
            className={adminInputClass}
            value={value.sendWindowStart}
            onChange={(e) => onChange({ ...value, sendWindowStart: e.target.value })}
          />
        </div>
        <div>
          <label className={adminLabelClass}>Send window end</label>
          <input
            type="time"
            className={adminInputClass}
            value={value.sendWindowEnd}
            onChange={(e) => onChange({ ...value, sendWindowEnd: e.target.value })}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={adminLabelClass}>Follow-up interval (hours)</label>
          <input
            type="number"
            min={1}
            className={adminInputClass}
            value={value.followUpIntervalHours}
            onChange={(e) =>
              onChange({ ...value, followUpIntervalHours: Number(e.target.value) || 1 })
            }
          />
        </div>
        <div>
          <label className={adminLabelClass}>Max attempts</label>
          <input
            type="number"
            min={1}
            className={adminInputClass}
            value={value.maxAttempts}
            onChange={(e) =>
              onChange({ ...value, maxAttempts: Math.max(1, Number(e.target.value) || 1) })
            }
          />
        </div>
      </div>

      <div className="space-y-4">
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Sequence
        </p>
        {value.steps.map((step, i) => (
          <div
            key={step.id}
            className="space-y-3 rounded-lg border border-neutral-100 bg-neutral-50/80 p-4 dark:border-neutral-800 dark:bg-neutral-950/50"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">
                Step {i + 1}
              </span>
              {value.steps.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeStep(i)}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  Remove
                </button>
              )}
            </div>
            <div>
              <label className={adminLabelClass}>Delay (hours from previous)</label>
              <input
                type="number"
                min={0}
                className={adminInputClass}
                value={step.delayHours}
                onChange={(e) => updateStep(i, { delayHours: Number(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className={adminLabelClass}>SMS template</label>
              <textarea
                className={`${adminInputClass} min-h-[88px] font-mono text-xs`}
                value={step.smsTemplate}
                onChange={(e) => updateStep(i, { smsTemplate: e.target.value })}
                placeholder="Hi {{name}}, …"
              />
            </div>
            <div>
              <label className={adminLabelClass}>Email template</label>
              <textarea
                className={`${adminInputClass} min-h-[88px] font-mono text-xs`}
                value={step.emailTemplate}
                onChange={(e) => updateStep(i, { emailTemplate: e.target.value })}
                placeholder="Hi {{name}}, …"
              />
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={addStep}
          className="inline-flex items-center gap-2 rounded-lg border border-dashed border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-800"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Add step
        </button>
      </div>
    </div>
  )
}
