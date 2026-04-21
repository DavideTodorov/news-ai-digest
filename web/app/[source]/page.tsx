import { redirect, notFound } from 'next/navigation'
import { getLatestDate } from '@/lib/db'
import { isValidSource } from '@/lib/sources'

export const revalidate = 3600

export default async function SourcePage({
  params,
}: {
  params: Promise<{ source: string }>
}) {
  const { source } = await params

  if (!isValidSource(source)) notFound()

  const latestDate = await getLatestDate(source)
  if (!latestDate) notFound()

  redirect(`/${source}/${latestDate}`)
}
