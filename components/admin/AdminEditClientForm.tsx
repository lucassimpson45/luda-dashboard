'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, Copy } from 'lucide-react'
import type { FeatureToggles } from '@/lib/admin-onboard-types'
import { defaultCampaignForm } from '@/lib/admin-onboard-types'
import type {
  AdminEditClientBundle,
  CampaignFormWithId,
  MessagingConfigRow,
} from '@/lib/admin-campaign-helpers'
import {
  campaignRowToFormWithId,
  enabledListFromFeatures,
  featuresFromEnabledList,
} from '@/lib/admin-campaign-helpers'
import {
  AdminToggle,
  CampaignEditor,
  adminInputClass,
  adminLabelClass,
} from '@/components/admin/CampaignEditor'

type MessagingFormFields = {
  twilio_number: string
  notification_email: string
  resend_from_email: string
  resend_from_name: string
  google_review_url: string
  jobber_webhook_secret: string
}

function emptyCampaignWithId(): CampaignFormWithId {
  return { ...defaultCampaignForm(), id: null }
}

function messagingToForm(m: MessagingConfigRow | null): MessagingFormFields {
  if (!m) {
    return {
      twilio_number: '',
      notification_email: '',
      resend_from_email: '',
      resend_from_name: '',
      google_review_url: '',
      jobber_webhook_secret: '',
    }
  }
  return {
    twilio_number: m.twilio_number ?? '',
    notification_email: m.notification_email ?? '',
    resend_from_email: m.resend_from_email ?? '',
    resend_from_name: m.resend_from_name ?? '',
    google_review_url: m.google_review_url ?? '',
    jobber_webhook_secret: m.jobber_webhook_secret ?? '',
  }
}

function initFromBundle(bundle: AdminEditClientBundle) {
  const { client, messaging, campaigns } = bundle
  const quoteRow = campaigns.find((c) => c.type === 'quote_followup')
  const reviewRow = campaigns.find((c) => c.type === 'review_request')
  return {
    name: client.name,
    business_type: client.business_type ?? '',
    retell_agent_id: client.retell_agent_id,
    password: '',
    logo_url: client.logo_url ?? '',
    active: client.active,
    features: featuresFromEnabledList(client.enabled_features),
    messaging: messagingToForm(messaging),
    quoteCampaign: quoteRow ? campaignRowToFormWithId(quoteRow) : emptyCampaignWithId(),
    reviewCampaign: reviewRow ? campaignRowToFormWithId(reviewRow) : emptyCampaignWithId(),
  }
}

type EditState = ReturnType<typeof initFromBundle>

export function AdminEditClientForm({ bundle, clientId }: { bundle: AdminEditClientBundle; clientId: string }) {
  const router = useRouter()
  const [s, setS] = useState<EditState>(() => initFromBundle(bundle))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const setFeatures = useCallback((patch: Partial<FeatureToggles>) => {
    setS((prev) => ({ ...prev, features: { ...prev.features, ...patch } }))
  }, [])

  const copySecret = async () => {
    try {
      await navigator.clipboard.writeText(s.messaging.jobber_webhook_secret ?? '')
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clientId) return
    setSaving(true)
    setError(null)

    const { id: _qid, ...quoteForm } = s.quoteCampaign
    const { id: _rid, ...reviewForm } = s.reviewCampaign

    const body: Record<string, unknown> = {
      name: s.name.trim(),
      business_type: s.business_type.trim() || null,
      retell_agent_id: s.retell_agent_id.trim(),
      logo_url: s.logo_url.trim() || null,
      active: s.active,
      enabled_features: enabledListFromFeatures(s.features),
      messaging: {
        twilio_number: s.messaging.twilio_number.trim() || null,
        notification_email: s.messaging.notification_email.trim() || null,
        resend_from_email: s.messaging.resend_from_email.trim() || null,
        resend_from_name: s.messaging.resend_from_name.trim() || null,
        google_review_url: s.messaging.google_review_url.trim() || null,
      },
      campaigns: {
        quote_followup: s.features.quoteFollowUp
          ? { id: s.quoteCampaign.id, ...quoteForm }
          : null,
        review_request: s.features.reviewRequest
          ? { id: s.reviewCampaign.id, ...reviewForm }
          : null,
      },
    }
    if (s.password.trim().length > 0) {
      body.password = s.password
    }

    const res = await fetch(`/api/admin/clients/${clientId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (res.status === 401) {
      router.replace('/admin/login')
      return
    }
    if (!res.ok) {
      const j = (await res.json()) as { error?: string }
      setError(j.error ?? 'Could not save.')
      setSaving(false)
      return
    }

    router.push('/admin/dashboard')
    router.refresh()
  }

  const card = 'rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900/80'

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-8">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      )}

      <div className={`${card} space-y-5`}>
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">Client</h2>
        <div>
          <label className={adminLabelClass}>
            Business name <span className="text-red-500">*</span>
          </label>
          <input
            required
            className={adminInputClass}
            value={s.name}
            onChange={(e) => setS((p) => ({ ...p, name: e.target.value }))}
          />
        </div>
        <div>
          <label className={adminLabelClass}>Business type</label>
          <input
            className={adminInputClass}
            placeholder="e.g. Plumber, Roofer, HVAC"
            value={s.business_type}
            onChange={(e) => setS((p) => ({ ...p, business_type: e.target.value }))}
          />
        </div>
        <div>
          <label className={adminLabelClass}>
            Retell agent ID <span className="text-red-500">*</span>
          </label>
          <input
            required
            className={`${adminInputClass} font-mono text-xs`}
            value={s.retell_agent_id}
            onChange={(e) => setS((p) => ({ ...p, retell_agent_id: e.target.value }))}
          />
        </div>
        <div>
          <label className={adminLabelClass}>New client password</label>
          <input
            type="password"
            autoComplete="new-password"
            placeholder="Leave blank to keep current"
            className={adminInputClass}
            value={s.password}
            onChange={(e) => setS((p) => ({ ...p, password: e.target.value }))}
          />
        </div>
        <div>
          <label className={adminLabelClass}>Logo URL (optional)</label>
          <input
            type="url"
            className={adminInputClass}
            placeholder="https://…"
            value={s.logo_url}
            onChange={(e) => setS((p) => ({ ...p, logo_url: e.target.value }))}
          />
        </div>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={s.active}
            onChange={(e) => setS((p) => ({ ...p, active: e.target.checked }))}
            className="h-4 w-4 rounded border-neutral-300 text-brand focus:ring-brand"
          />
          <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Active</span>
        </label>
      </div>

      <div className={`${card} space-y-3`}>
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">Enabled features</h2>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          When all four are on (or none saved), the client dashboard shows every tab.
        </p>
        <div className="space-y-2">
          <AdminToggle
            label="Receptionist"
            checked={s.features.receptionist}
            onChange={(v) => setFeatures({ receptionist: v })}
          />
          <AdminToggle
            label="Quote follow-up"
            checked={s.features.quoteFollowUp}
            onChange={(v) => setFeatures({ quoteFollowUp: v })}
          />
          <AdminToggle
            label="Review request"
            checked={s.features.reviewRequest}
            onChange={(v) => setFeatures({ reviewRequest: v })}
          />
          <AdminToggle
            label="Outbound"
            checked={s.features.outbound}
            onChange={(v) => setFeatures({ outbound: v })}
          />
        </div>
      </div>

      <div className={`${card} space-y-5`}>
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">Messaging</h2>
        <div>
          <label className={adminLabelClass}>Twilio phone number</label>
          <input
            className={adminInputClass}
            value={s.messaging.twilio_number}
            onChange={(e) =>
              setS((p) => ({
                ...p,
                messaging: { ...p.messaging, twilio_number: e.target.value },
              }))
            }
          />
        </div>
        <div>
          <label className={adminLabelClass}>Resend from email</label>
          <input
            type="email"
            className={adminInputClass}
            value={s.messaging.resend_from_email}
            onChange={(e) =>
              setS((p) => ({
                ...p,
                messaging: { ...p.messaging, resend_from_email: e.target.value },
              }))
            }
          />
        </div>
        <div>
          <label className={adminLabelClass}>Resend from name</label>
          <input
            className={adminInputClass}
            value={s.messaging.resend_from_name}
            onChange={(e) =>
              setS((p) => ({
                ...p,
                messaging: { ...p.messaging, resend_from_name: e.target.value },
              }))
            }
          />
        </div>
        <div>
          <label className={adminLabelClass}>Google Review URL</label>
          <input
            type="url"
            className={adminInputClass}
            value={s.messaging.google_review_url}
            onChange={(e) =>
              setS((p) => ({
                ...p,
                messaging: { ...p.messaging, google_review_url: e.target.value },
              }))
            }
          />
        </div>
        <div>
          <label className={adminLabelClass}>Notification email</label>
          <input
            type="email"
            className={adminInputClass}
            value={s.messaging.notification_email}
            onChange={(e) =>
              setS((p) => ({
                ...p,
                messaging: { ...p.messaging, notification_email: e.target.value },
              }))
            }
          />
        </div>
        <div>
          <label className={adminLabelClass}>Webhook secret (read-only)</label>
          <div className="flex gap-2">
            <input
              readOnly
              className={`${adminInputClass} font-mono text-xs`}
              value={s.messaging.jobber_webhook_secret}
            />
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

      <div className={`${card} space-y-6`}>
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">Campaigns</h2>
        {s.features.quoteFollowUp && (
          <div className="space-y-2">
            {!s.quoteCampaign.id && (
              <p className="text-xs text-amber-700 dark:text-amber-300/90">
                No quote follow-up campaign yet — configure below, then save to create it.
              </p>
            )}
            <CampaignEditor
              title="Quote follow-up"
              value={s.quoteCampaign}
              onChange={(quoteCampaign) =>
                setS((p) => ({ ...p, quoteCampaign: { ...quoteCampaign, id: p.quoteCampaign.id } }))
              }
            />
          </div>
        )}
        {s.features.reviewRequest && (
          <div className="space-y-2">
            {!s.reviewCampaign.id && (
              <p className="text-xs text-amber-700 dark:text-amber-300/90">
                No review request campaign yet — configure below, then save to create it.
              </p>
            )}
            <CampaignEditor
              title="Review request"
              value={s.reviewCampaign}
              onChange={(reviewCampaign) =>
                setS((p) => ({
                  ...p,
                  reviewCampaign: { ...reviewCampaign, id: p.reviewCampaign.id },
                }))
              }
            />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 rounded-lg bg-brand py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-hover disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        <Link
          href="/admin/dashboard"
          className="rounded-lg border border-neutral-200 px-4 py-2.5 text-center text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
        >
          Cancel
        </Link>
      </div>
    </form>
  )
}
