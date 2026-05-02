'use client'

import { QuoteFollowUpTab } from './QuoteFollowUpTab'
import type { FollowUpContact } from './QuoteFollowUpTab'

type Props = { contacts: FollowUpContact[] }

/** Review-request campaign contacts (same UI as quote follow-up). */
export function ReviewsTab({ contacts }: Props) {
  return <QuoteFollowUpTab contacts={contacts} />
}
