'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import type { ClientPublic } from '@/lib/clients'
import type { AdminEditClientBundle } from '@/lib/admin-campaign-helpers'
import { AdminEditClientForm } from '@/components/admin/AdminEditClientForm'

export default function AdminEditClientPage() {
  const router = useRouter()
  const params = useParams()
  const id = typeof params.id === 'string' ? params.id : ''

  const [bundle, setBundle] = useState<AdminEditClientBundle | null | undefined>(undefined)

  const load = useCallback(async () => {
    if (!id) return
    const res = await fetch(`/api/admin/clients/${id}`)
    if (res.status === 401) {
      router.replace('/admin/login')
      return
    }
    if (!res.ok) {
      setBundle(null)
      return
    }
    const data = (await res.json()) as {
      client: ClientPublic
      messaging?: unknown
      campaigns?: unknown
    }
    setBundle({
      client: data.client,
      messaging: (data.messaging ?? null) as AdminEditClientBundle['messaging'],
      campaigns: (Array.isArray(data.campaigns) ? data.campaigns : []) as AdminEditClientBundle['campaigns'],
    })
  }, [id, router])

  useEffect(() => {
    void load()
  }, [load])

  if (bundle === undefined) {
    return (
      <div className="min-h-screen bg-neutral-50 px-4 py-8 dark:bg-neutral-950">
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Loading…</p>
      </div>
    )
  }

  if (bundle === null) {
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
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <Link
            href="/admin/dashboard"
            className="text-sm text-neutral-500 transition-colors hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
          >
            ← Back to admin
          </Link>
          <h1 className="mt-4 text-xl font-semibold text-neutral-900 dark:text-white">Edit client</h1>
          <p className="mt-1 font-mono text-xs text-neutral-400">{bundle.client.id}</p>
        </div>

        <AdminEditClientForm key={bundle.client.id} bundle={bundle} clientId={id} />
      </div>
    </div>
  )
}
