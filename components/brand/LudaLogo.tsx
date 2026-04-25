import Image from 'next/image'
import Link from 'next/link'
import { clsx } from 'clsx'

type LudaLogoProps = {
  className?: string
  /** CSS height, width scales with aspect ratio */
  height?: number
  href?: string
  /** When true, show only the wordmark area is not needed—full asset is used */
  priority?: boolean
}

export function LudaLogo({ className, height = 40, href, priority }: LudaLogoProps) {
  // Intrinsic size for aspect ratio; display size via max-height
  const intrinsicW = 560
  const intrinsicH = 140

  const img = (
    <Image
      src="/luda-ai-logo.png"
      alt="Luda AI"
      width={intrinsicW}
      height={intrinsicH}
      className={clsx('h-auto w-auto max-w-[min(100%,280px)]', className)}
      style={{ maxHeight: height }}
      priority={Boolean(priority)}
    />
  )

  if (href) {
    return (
      <Link href={href} className="inline-flex shrink-0" target={href.startsWith('http') ? '_blank' : undefined} rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}>
        {img}
      </Link>
    )
  }

  return <span className="inline-flex shrink-0">{img}</span>
}
