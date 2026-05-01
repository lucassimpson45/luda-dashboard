import Image from 'next/image'
import Link from 'next/link'
import { clsx } from 'clsx'

type LudaLogoProps = {
  className?: string
  /** Square logo — width and height match this value (px) */
  height?: number
  href?: string
  priority?: boolean
}

export function LudaLogo({ className, height = 40, href, priority }: LudaLogoProps) {
  const size = height
  const img = (
    <Image
      src="/luda-no-background.png"
      alt="Luda AI"
      width={size}
      height={size}
      className={clsx('shrink-0 object-contain', className)}
      priority={Boolean(priority)}
    />
  )

  if (href) {
    return (
      <Link
        href={href}
        className="inline-flex shrink-0"
        target={href.startsWith('http') ? '_blank' : undefined}
        rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
      >
        {img}
      </Link>
    )
  }

  return <span className="inline-flex shrink-0">{img}</span>
}
