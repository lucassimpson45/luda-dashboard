'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import type { AdminClientSummary } from '@/types'

function ClientAvatar({ src, alt }: { src: string; alt: string }) {
  const remote = /^https?:\/\//i.test(src)
  if (remote) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt} className="h-full w-full object-cover" />
    )
  }
  return <Image src={src} alt={alt} fill className="object-cover" sizes="48px" />
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const [clients, setClients] = useState<AdminClientSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/clients')
    if (res.status === 401) {
      router.replace('/admin/login')
      return
    }
    if (!res.ok) {
      setError('Could not load clients.')
      setClients([])
      return
    }
    const data = (await res.json()) as { clients: AdminClientSummary[] }
    setClients(data.clients)
    setError(null)
  }, [router])

  useEffect(() => {
    void load()
  }, [load])

  async function handleLogout() {
    await fetch('/api/admin/auth', { method: 'DELETE' })
    router.push('/admin/login')
  }

  return (
    <div className="min-h-screen bg-neutral-50 px-4 py-8 dark:bg-neutral-950">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-neutral-900 dark:text-white">Luda AI — Admin</h1>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Welcome, Lucas &amp; Dave</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin/clients/new"
              className="inline-flex items-center justify-center rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-hover"
            >
              Add client
            </Link>
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
            >
              <LogOut size={16} aria-hidden />
              Log out
            </button>
          </div>
        </header>

        {error && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
            {error}
          </div>
        )}

        {clients === null ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Loading clients…</p>
        ) : clients.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-200 bg-white py-16 text-center dark:border-neutral-800 dark:bg-neutral-900/80">
            <p className="text-sm font-medium text-neutral-600 dark:text-neutral-300">No clients yet</p>
            <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
              Add a client in Supabase or use <strong>Add client</strong> (requires{' '}
              <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
              <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">SUPABASE_SERVICE_ROLE_KEY</code>).
            </p>
            <Link
              href="/admin/clients/new"
              className="mt-6 inline-block rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover"
            >
              Add your first client
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {clients.map((c) => (
              <div
                key={c.id}
                className="flex flex-col rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900/80"
              >
                <div className="mb-4 flex items-start gap-3">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800">
                    <ClientAvatar src={c.logoPath} alt="" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate font-semibold text-neutral-900 dark:text-white">{c.name}</h2>
                    <span
                      className={
                        c.active
                          ? 'mt-1 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200'
                          : 'mt-1 inline-block rounded-full bg-neutral-200 px-2 py-0.5 text-[11px] font-medium text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300'
                      }
                    >
                      {c.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                <dl className="mb-4 flex-1 space-y-2 text-sm">
                  <div className="flex justify-between gap-2">
                    <dt className="text-neutral-500 dark:text-neutral-400">Calls (30d)</dt>
                    <dd className="font-medium text-neutral-900 dark:text-white">{c.totalCalls}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-neutral-500 dark:text-neutral-400">Last call</dt>
                    <dd className="font-medium text-neutral-900 dark:text-white">
                      {c.lastCallDate ?? '—'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-neutral-500 dark:text-neutral-400">Booking rate</dt>
                    <dd className="font-medium text-neutral-900 dark:text-white">{c.bookingRate}%</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-neutral-500 dark:text-neutral-400">Appointments (30d)</dt>
                    <dd className="font-medium text-neutral-900 dark:text-white">{c.appointmentsBooked}</dd>
                  </div>
                </dl>

                <div className="mt-auto flex flex-col gap-2">
                  <Link
                    href={`/admin/clients/${c.id}/edit`}
                    className="block w-full rounded-lg border border-neutral-200 py-2.5 text-center text-sm font-medium text-neutral-800 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-100 dark:hover:bg-neutral-800"
                  >
                    Edit
                  </Link>
                  <Link
                    href="/login"
                    className="block w-full rounded-lg bg-brand py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-brand-hover"
                  >
                    Client login
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
