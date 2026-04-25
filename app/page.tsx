import { redirect } from 'next/navigation'
import { isAuthenticated } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default function Home() {
  if (isAuthenticated()) {
    redirect('/dashboard')
  } else {
    redirect('/login')
  }
}
