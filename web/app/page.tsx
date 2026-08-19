import { redirect } from 'next/navigation'
import { getDigestDates } from '@/lib/db'
import { resolveSource } from '@/lib/sources'
import { EmptyState } from '@/components/empty-state'

export const revalidate = 3600

export default async function Home() {
  // Resolve the landing page from what is actually in the database rather than
  // a hardcoded source, so the root never 404s while a newly added source is
  // still waiting for its first digest.
  const [latest] = await getDigestDates(1, 0)

  const source = latest && resolveSource(latest.sources, '')
  if (latest && source) redirect(`/${source}/${latest.date}`)

  return (
    <EmptyState
      title="Още няма броеве"
      body="Първият брой ще се появи тук, след като обобщителят го публикува."
    />
  )
}
