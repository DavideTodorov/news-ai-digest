import { redirect } from 'next/navigation'
import { getDigestDates } from '@/lib/db'
import { VALID_SOURCES } from '@/lib/sources'

export const revalidate = 3600

export default async function Home() {
  // Resolve the landing page from what is actually in the database rather than
  // a hardcoded source, so the root never 404s while a newly added source is
  // still waiting for its first digest.
  const [latest] = await getDigestDates(1, 0)
  if (!latest) redirect(`/${VALID_SOURCES[0]}`)

  const preferred = VALID_SOURCES.find((s) => latest.sources.includes(s))

  redirect(preferred ? `/${preferred}/${latest.date}` : `/${VALID_SOURCES[0]}`)
}
