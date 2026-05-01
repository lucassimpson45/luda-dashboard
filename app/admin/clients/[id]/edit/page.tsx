'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import type { ClientPublic } from '@/lib/clients'

export default function AdminEditClientPage() {
  const router = useRouter()
  const params = useParams()
  const id = typeof params.id === 'string' ? params.id : ''

  const [client, setClient] = useState<ClientPublic | null | undefined>(undefined)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!id) return
    const res = await fetch(`/api/admin/clients/${id}`)
    if (res.status === 401) {
      router.replace('/admin/login')
      return
    }
    if (!res.ok) {
      setClient(null)
      return
    }
    const data = (await res.json()) as { client: ClientPublic }
    setClient(data.client)
  }, [id, router])

  useEffect(() => {
    void load()
  }, [load])

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!id) return
    setSaving(true)
    setError(null)

    const form = e.currentTarget
    const fd = new FormData(form)
    const password = String(fd.get('password') ?? '')

    const body: Record<string, unknown> = {
      name: String(fd.get('name') ?? '').trim(),
      business_type: String(fd.get('business_type') ?? '').trim() || null,
      retell_agent_id: String(fd.get('retell_agent_id') ?? '').trim(),
      logo_url: String(fd.get('logo_url') ?? '').trim() || null,
      active: fd.get('active') === 'on',
    }
    if (password.length > 0) {
      body.password = password
    }

    const res = await fetch(`/api/admin/clients/${id}`, {
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
      setError(j.error ?? 'Could not update client.')
      setSaving(false)
      return
    }

    router.push('/admin/dashboard')
    router.refresh()
  }

  if (client === undefined) {
    return (
      <div className="min-h-screen bg-neutral-50 px-4 py-8 dark:bg-neutral-950">
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Loading…</p>
      </div>
    )
  }

  if (client === null) {
    return (
      <div className="min-h-screen bg-neutral-50 px-4 py-8 dark:bg-neutral-950">
        <p className="text-sm text-neutral-600 dark:text-neutral-300">Client not found.</p>
        <Link href="/admin/dashboard" className="mt-4 inline-block text-sm text-brand">
          ← Admin dashboard
        </Link>
      </div>
    )
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
          <h1 className="mt-4 text-xl font-semibold text-neutral-900 dark:text-white">Edit client</h1>
          <p className="mt-1 font-mono text-xs text-neutral-400">{client.id}</p>
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
              defaultValue={client.name}
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
              defaultValue={client.business_type ?? ''}
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
              defaultValue={client.retell_agent_id}
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 font-mono text-sm text-neutral-900 outline-none ring-brand focus:ring-2 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300"
            >
              New client password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="Leave blank to keep current"
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
              defaultValue={client.logo_url ?? ''}
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none ring-brand focus:ring-2 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              id="active"
              name="active"
              type="checkbox"
              defaultChecked={client.active}
              className="h-4 w-4 rounded border-neutral-300 text-brand focus:ring-brand"
            />
            <label htmlFor="active" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Active
            </label>
          </div>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
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
      </div>
    </div>
  )
}
