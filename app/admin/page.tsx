import { redirect } from 'next/navigation'

export default function AdminIndexPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>
}) {
  const raw = searchParams.onboarded
  const onboarded =
    raw === '1' || (Array.isArray(raw) && raw[0] === '1')
  redirect(onboarded ? '/admin/dashboard?onboarded=1' : '/admin/dashboard')
}
