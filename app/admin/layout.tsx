import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Luda AI — Admin',
  description: 'Luda AI admin — client dashboards',
  icons: {
    icon: '/luda-ai-logo.png',
    apple: '/luda-ai-logo.png',
  },
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children
}
