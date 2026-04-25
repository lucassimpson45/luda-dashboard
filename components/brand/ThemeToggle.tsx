'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { clsx } from 'clsx'

export function ThemeToggle({ className }: { className?: string }) {
  const { setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <span
        className={clsx(
          'inline-flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900',
          className
        )}
        aria-hidden
      />
    )
  }

  const isDark = resolvedTheme === 'dark'

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={clsx(
        'inline-flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-brand dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-brand',
        className
      )}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}
