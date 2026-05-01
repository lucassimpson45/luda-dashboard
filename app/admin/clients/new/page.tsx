'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function AdminNewClientPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const form = e.currentTarget
    const fd = new FormData(form)

    const body = {
      name: String(fd.get('name') ?? '').trim(),
      business_type: String(fd.get('business_type') ?? '').trim() || null,
      retell_agent_id: String(fd.get('retell_agent_id') ?? '').trim(),
      password: String(fd.get('password') ?? ''),
      logo_url: String(fd.get('logo_url') ?? '').trim() || null,
      active: fd.get('active') === 'on',
    }

    const res = await fetch('/api/admin/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (res.status === 401) {
      router.replace('/admin/login')
      return
    }

    if (!res.ok) {
      const j = (await res.json()) as { error?: string }
      setError(j.error ?? 'Could not save client.')
      setSaving(false)
      return
    }

    router.push('/admin/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-neutral-50 px-4 py-8 dark:bg-neutral-950">
      <div className="mx-auto max-w-lg">
        <div className="mb-8">
          <Link
            href="/admin/dashboard"
            className="text-sm text-neutral-500 transition-colors hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
          >
            ← Back to admin
          </Link>
          <h1 className="mt-4 text-xl font-semibold text-neutral-900 dark:text-white">Add client</h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Creates a client row and the password they use at <code className="text-xs">/login</code>.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </div>
        )}

        <form
          onSubmit={(e) => void onSubmit(e)}
          className="space-y-5 rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900/80"
        >
          <div>
            <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Business name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              name="name"
              required
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none ring-brand focus:ring-2 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white"
            />
          </div>

          <div>
            <label
              htmlFor="business_type"
              className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300"
            >
              Business type
            </label>
            <input
              id="business_type"
              name="business_type"
              placeholder="e.g. Plumber, Roofer, HVAC"
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none ring-brand focus:ring-2 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white"
            />
          </div>

          <div>
            <label
              htmlFor="retell_agent_id"
              className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300"
            >
              Retell agent ID <span className="text-red-500">*</span>
            </label>
            <input
              id="retell_agent_id"
              name="retell_agent_id"
              required
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 font-mono text-sm text-neutral-900 outline-none ring-brand focus:ring-2 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300"
            >
              Client password <span className="text-red-500">*</span>
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="new-password"
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none ring-brand focus:ring-2 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white"
            />
          </div>

          <div>
            <label htmlFor="logo_url" className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Logo URL <span className="font-normal text-neutral-400">(optional)</span>
            </label>
            <input
              id="logo_url"
              name="logo_url"
              type="url"
              placeholder="https://…"
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none ring-brand focus:ring-2 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              id="active"
              name="active"
              type="checkbox"
              defaultChecked
              className="h-4 w-4 rounded border-neutral-300 text-brand focus:ring-brand"
            />
            <label htmlFor="active" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Active
            </label>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-lg bg-brand py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-hover disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Create client'}
            </button>
            <Link
              href="/admin/dashboard"
              className="rounded-lg border border-neutral-200 px-4 py-2.5 text-center text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
