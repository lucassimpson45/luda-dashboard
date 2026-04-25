'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LudaLogo } from '@/components/brand/LudaLogo'
import { ThemeToggle } from '@/components/brand/ThemeToggle'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    if (res.ok) {
      router.push('/dashboard')
    } else {
      setError('Incorrect password. Try again.')
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen bg-neutral-50 px-4 dark:bg-neutral-950">
      <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>

      <div className="flex min-h-screen items-center justify-center">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex justify-center">
            <LudaLogo height={48} priority />
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-8 dark:border-neutral-800 dark:bg-neutral-900">
            <h1 className="mb-1 text-xl font-semibold text-neutral-900 dark:text-white">Client portal</h1>
            <p className="mb-6 text-sm text-neutral-500 dark:text-neutral-400">
              Enter your access password to view your receptionist dashboard.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm text-neutral-600 dark:text-neutral-400" htmlFor="password">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
                  placeholder="Enter your password"
                  required
                />
              </div>

              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-brand py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-hover disabled:opacity-50"
              >
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          </div>

          <p className="mt-6 flex items-center justify-center gap-2 text-center text-xs text-neutral-400 dark:text-neutral-500">
            <span>Powered by</span>
            <LudaLogo href="https://goluda.ai" height={20} className="opacity-90" />
          </p>
        </div>
      </div>
    </div>
  )
}
