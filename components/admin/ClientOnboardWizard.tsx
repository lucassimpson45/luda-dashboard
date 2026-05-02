'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, Copy } from 'lucide-react'
import type { OnboardFormState } from '@/lib/admin-onboard-types'
import {
  BUSINESS_TYPES,
  US_TIMEZONES,
  buildStepFlow,
  initialOnboardForm,
} from '@/lib/admin-onboard-types'
import {
  AdminToggle,
  CampaignEditor,
  adminInputClass as inputClass,
  adminLabelClass as labelClass,
} from '@/components/admin/CampaignEditor'

const cardClass =
  'rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900/80'
const STEP_LABELS = ['Basics', 'Voice', 'Messaging', 'Campaigns', 'Review'] as const

export function ClientOnboardWizard() {
  const router = useRouter()
  const [form, setForm] = useState<OnboardFormState>(() => initialOnboardForm())
  const [flowIndex, setFlowIndex] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const stepFlow = useMemo(() => buildStepFlow(form.basics.features), [form.basics.features])
  const currentStep = stepFlow[flowIndex] ?? 0

  useEffect(() => {
    setFlowIndex((i) => Math.min(i, Math.max(0, stepFlow.length - 1)))
  }, [stepFlow])

  useEffect(() => {
    if (currentStep !== 2) return
    setForm((f) => {
      if (f.messaging.webhookSecret.trim()) return f
      const secret =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `wh_${Date.now().toString(36)}`
      return { ...f, messaging: { ...f.messaging, webhookSecret: secret } }
    })
  }, [currentStep])

  const goNext = useCallback(() => {
    const nextIdx = flowIndex + 1
    if (nextIdx < stepFlow.length) setFlowIndex(nextIdx)
  }, [flowIndex, stepFlow])

  const goBack = useCallback(() => {
    if (flowIndex > 0) setFlowIndex((i) => i - 1)
  }, [flowIndex])

  const validateCurrent = (): string | null => {
    const f = form.basics.features
    switch (currentStep) {
      case 0:
        if (!form.basics.name.trim()) return 'Business name is required.'
        if (!form.basics.password) return 'Client portal password is required.'
        if (!form.basics.notificationEmail.trim()) return 'Notification email is required.'
        if (!form.basics.timezone) return 'Timezone is required.'
        return null
      case 1:
        if ((f.receptionist || f.outbound) && !form.voice.inboundAgentId.trim()) {
          return 'Inbound Agent ID is required.'
        }
        return null
      case 2:
        if (f.quoteFollowUp || f.reviewRequest) {
          if (!form.messaging.twilioNumber.trim()) return 'Twilio phone number is required.'
          if (!form.messaging.resendFromEmail.trim()) return 'Resend from email is required.'
          if (f.reviewRequest && !form.messaging.googleReviewUrl.trim()) {
            return 'Google Review URL is required.'
          }
        }
        return null
      case 3:
        if (f.quoteFollowUp && form.quoteCampaign.steps.length === 0) {
          return 'Add at least one step to the quote follow-up campaign.'
        }
        if (f.reviewRequest && form.reviewCampaign.steps.length === 0) {
          return 'Add at least one step to the review request campaign.'
        }
        return null
      default:
        return null
    }
  }

  const handleNext = () => {
    const v = validateCurrent()
    if (v) {
      setError(v)
      return
    }
    setError(null)
    goNext()
  }

  const copySecret = async () => {
    try {
      await navigator.clipboard.writeText(form.messaging.webhookSecret)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  const submit = async () => {
    setSaving(true)
    setError(null)
    const res = await fetch('/api/admin/onboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.status === 401) {
      router.replace('/admin/login')
      return
    }
    if (!res.ok) {
      const j = (await res.json()) as { error?: string }
      setError(j.error ?? 'Could not create client.')
      setSaving(false)
      return
    }
    router.push('/admin?onboarded=1')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-neutral-50 px-4 py-8 dark:bg-neutral-950">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <Link
            href="/admin/dashboard"
            className="text-sm text-neutral-500 transition-colors hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
          >
            ← Back to admin
          </Link>
          <h1 className="mt-4 text-xl font-semibold text-neutral-900 dark:text-white">
            Onboard new client
          </h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Multi-step setup for portal access, voice, messaging, and campaigns.
          </p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="mb-2 flex justify-between text-xs font-medium text-neutral-500 dark:text-neutral-400">
            <span>
              Step {flowIndex + 1} of {stepFlow.length}
            </span>
            <span>{STEP_LABELS[currentStep]}</span>
          </div>
          <div className="flex gap-1">
            {stepFlow.map((sid, i) => (
              <div
                key={`${sid}-${i}`}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i <= flowIndex ? 'bg-brand' : 'bg-neutral-200 dark:bg-neutral-800'
                }`}
              />
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </div>
        )}

        <div className={cardClass}>
          {currentStep === 0 && (
            <div className="space-y-5">
              <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">Client basics</h2>
              <div>
                <label className={labelClass}>
                  Business name <span className="text-red-500">*</span>
                </label>
                <input
                  className={inputClass}
                  value={form.basics.name}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, basics: { ...p.basics, name: e.target.value } }))
                  }
                />
              </div>
              <div>
                <label className={labelClass}>Business type</label>
                <select
                  className={inputClass}
                  value={form.basics.businessType}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, basics: { ...p.basics, businessType: e.target.value } }))
                  }
                >
                  {BUSINESS_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>
                  Notification email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  className={inputClass}
                  value={form.basics.notificationEmail}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      basics: { ...p.basics, notificationEmail: e.target.value },
                    }))
                  }
                />
              </div>
              <div>
                <label className={labelClass}>
                  Timezone <span className="text-red-500">*</span>
                </label>
                <select
                  className={inputClass}
                  value={form.basics.timezone}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, basics: { ...p.basics, timezone: e.target.value } }))
                  }
                >
                  {US_TIMEZONES.map((z) => (
                    <option key={z.value} value={z.value}>
                      {z.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Logo URL (optional)</label>
                <input
                  type="url"
                  className={inputClass}
                  placeholder="https://…"
                  value={form.basics.logoUrl}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, basics: { ...p.basics, logoUrl: e.target.value } }))
                  }
                />
              </div>
              <div>
                <label className={labelClass}>
                  Client portal password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  className={inputClass}
                  value={form.basics.password}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, basics: { ...p.basics, password: e.target.value } }))
                  }
                />
              </div>
              <div className="space-y-2">
                <p className={labelClass}>Features</p>
                <div className="space-y-2">
                  <AdminToggle
                    label="Receptionist"
                    checked={form.basics.features.receptionist}
                    onChange={(v) =>
                      setForm((p) => ({
                        ...p,
                        basics: {
                          ...p.basics,
                          features: { ...p.basics.features, receptionist: v },
                        },
                      }))
                    }
                  />
                  <AdminToggle
                    label="Quote follow-up"
                    checked={form.basics.features.quoteFollowUp}
                    onChange={(v) =>
                      setForm((p) => ({
                        ...p,
                        basics: {
                          ...p.basics,
                          features: { ...p.basics.features, quoteFollowUp: v },
                        },
                      }))
                    }
                  />
                  <AdminToggle
                    label="Review request"
                    checked={form.basics.features.reviewRequest}
                    onChange={(v) =>
                      setForm((p) => ({
                        ...p,
                        basics: {
                          ...p.basics,
                          features: { ...p.basics.features, reviewRequest: v },
                        },
                      }))
                    }
                  />
                  <AdminToggle
                    label="Outbound"
                    checked={form.basics.features.outbound}
                    onChange={(v) =>
                      setForm((p) => ({
                        ...p,
                        basics: {
                          ...p.basics,
                          features: { ...p.basics.features, outbound: v },
                        },
                      }))
                    }
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div className="space-y-5">
              <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">
                Receptionist &amp; voice
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Compatible with any voice provider — Retell, custom, or proprietary.
              </p>
              <div>
                <label className={labelClass}>Inbound Agent ID</label>
                <input
                  className={`${inputClass} font-mono text-xs`}
                  value={form.voice.inboundAgentId}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, voice: { ...p.voice, inboundAgentId: e.target.value } }))
                  }
                />
              </div>
              <div>
                <label className={labelClass}>Outbound Agent ID</label>
                <input
                  className={`${inputClass} font-mono text-xs`}
                  value={form.voice.outboundAgentId}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, voice: { ...p.voice, outboundAgentId: e.target.value } }))
                  }
                />
              </div>
              <div>
                <label className={labelClass}>Agent phone number</label>
                <input
                  className={inputClass}
                  placeholder="+1…"
                  value={form.voice.agentPhoneNumber}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, voice: { ...p.voice, agentPhoneNumber: e.target.value } }))
                  }
                />
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-5">
              <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">Messaging</h2>
              <div>
                <label className={labelClass}>Twilio phone number</label>
                <input
                  className={inputClass}
                  value={form.messaging.twilioNumber}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      messaging: { ...p.messaging, twilioNumber: e.target.value },
                    }))
                  }
                />
              </div>
              <div>
                <label className={labelClass}>Resend from email</label>
                <input
                  type="email"
                  className={inputClass}
                  value={form.messaging.resendFromEmail}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      messaging: { ...p.messaging, resendFromEmail: e.target.value },
                    }))
                  }
                />
              </div>
              <div>
                <label className={labelClass}>Resend from name</label>
                <input
                  className={inputClass}
                  value={form.messaging.resendFromName}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      messaging: { ...p.messaging, resendFromName: e.target.value },
                    }))
                  }
                />
              </div>
              {form.basics.features.reviewRequest && (
                <div>
                  <label className={labelClass}>Google Review URL</label>
                  <input
                    type="url"
                    className={inputClass}
                    value={form.messaging.googleReviewUrl}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        messaging: { ...p.messaging, googleReviewUrl: e.target.value },
                      }))
                    }
                  />
                </div>
              )}
              <div>
                <label className={labelClass}>Webhook Secret (share with client CRM)</label>
                <div className="flex gap-2">
                  <input readOnly className={`${inputClass} font-mono text-xs`} value={form.messaging.webhookSecret} />
                  <button
                    type="button"
                    onClick={() => void copySecret()}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-800"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">Campaigns</h2>
              {form.basics.features.quoteFollowUp && (
                <CampaignEditor
                  title="Quote follow-up"
                  value={form.quoteCampaign}
                  onChange={(quoteCampaign) => setForm((p) => ({ ...p, quoteCampaign }))}
                />
              )}
              {form.basics.features.reviewRequest && (
                <CampaignEditor
                  title="Review request"
                  value={form.reviewCampaign}
                  onChange={(reviewCampaign) => setForm((p) => ({ ...p, reviewCampaign }))}
                />
              )}
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-4 text-sm text-neutral-700 dark:text-neutral-200">
              <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">Review &amp; save</h2>
              <dl className="space-y-2 rounded-lg bg-neutral-50 p-4 dark:bg-neutral-950/60">
                <div className="flex justify-between gap-2">
                  <dt className="text-neutral-500 dark:text-neutral-400">Business</dt>
                  <dd className="text-right font-medium">{form.basics.name}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-neutral-500 dark:text-neutral-400">Type</dt>
                  <dd className="text-right">{form.basics.businessType}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-neutral-500 dark:text-neutral-400">Timezone</dt>
                  <dd className="text-right">{form.basics.timezone}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-neutral-500 dark:text-neutral-400">Notify</dt>
                  <dd className="truncate text-right">{form.basics.notificationEmail}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-neutral-500 dark:text-neutral-400">Features</dt>
                  <dd className="text-right text-xs">
                    {[
                      form.basics.features.receptionist && 'Receptionist',
                      form.basics.features.quoteFollowUp && 'Quote',
                      form.basics.features.reviewRequest && 'Review',
                      form.basics.features.outbound && 'Outbound',
                    ]
                      .filter(Boolean)
                      .join(', ') || 'None'}
                  </dd>
                </div>
              </dl>
              {(form.basics.features.receptionist || form.basics.features.outbound) && (
                <p className="text-xs text-neutral-500">
                  Inbound agent: <span className="font-mono">{form.voice.inboundAgentId || '—'}</span>
                </p>
              )}
              {(form.basics.features.quoteFollowUp || form.basics.features.reviewRequest) && (
                <p className="text-xs text-neutral-500">
                  Twilio: {form.messaging.twilioNumber || '—'} · Webhook secret configured
                </p>
              )}
            </div>
          )}

          <div className="mt-8 flex flex-wrap gap-3">
            {flowIndex > 0 && (
              <button
                type="button"
                onClick={goBack}
                className="rounded-lg border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
              >
                Back
              </button>
            )}
            {currentStep < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                className="rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-hover"
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                disabled={saving}
                onClick={() => void submit()}
                className="rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
              >
                {saving ? 'Creating…' : 'Create client'}
              </button>
            )}
            <Link
              href="/admin/dashboard"
              className="rounded-lg border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
            >
              Cancel
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
