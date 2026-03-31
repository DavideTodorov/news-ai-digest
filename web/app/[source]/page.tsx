import { redirect, notFound } from 'next/navigation'
import { getLatestDate } from '@/lib/db'

const VALID_SOURCES = ['bgonair', 'investor']

export default async function SourcePage({
  params,
}: {
  params: Promise<{ source: string }>
}) {
  const { source } = await params

  if (!VALID_SOURCES.includes(source)) notFound()

  const latestDate = await getLatestDate(source)
  if (!latestDate) notFound()

  redirect(`/${source}/${latestDate}`)
}
