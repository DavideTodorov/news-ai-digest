import postgres from 'postgres'

declare global {
  // eslint-disable-next-line no-var
  var _sql: ReturnType<typeof postgres> | undefined
}

const sql =
  globalThis._sql ??
  postgres(process.env.DATABASE_URL!, {
    max: 5,
    idle_timeout: 20,
  })

if (process.env.NODE_ENV !== 'production') globalThis._sql = sql

export default sql

import { DIGEST_PAGE_SIZE } from './constants'

export type DigestDate = {
  date: string
  sources: string[]
}

export async function getDigestDates(limit = DIGEST_PAGE_SIZE, offset = 0): Promise<DigestDate[]> {
  const rows = await sql<{ date: string; sources: string[] }[]>`
    SELECT date::text, array_agg(source ORDER BY source) AS sources
    FROM digests
    GROUP BY date
    ORDER BY date DESC
    LIMIT ${limit} OFFSET ${offset}
  `
  return rows
}

export async function getDigestCount(): Promise<number> {
  const rows = await sql<{ count: string }[]>`SELECT COUNT(DISTINCT date) FROM digests`
  return parseInt(rows[0].count)
}

export async function getDigestEntry(date: string): Promise<DigestDate | null> {
  const rows = await sql<{ date: string; sources: string[] }[]>`
    SELECT date::text, array_agg(source ORDER BY source) AS sources
    FROM digests
    WHERE date = ${date}
    GROUP BY date
    LIMIT 1
  `
  return rows[0] ?? null
}

export async function getDigestContent(
  date: string,
  source: string
): Promise<string | null> {
  const rows = await sql<{ content: string }[]>`
    SELECT content FROM digests
    WHERE date = ${date} AND source = ${source}
    LIMIT 1
  `
  return rows[0]?.content ?? null
}

export async function getLatestDate(source: string): Promise<string | null> {
  const rows = await sql<{ date: string }[]>`
    SELECT date::text FROM digests
    WHERE source = ${source}
    ORDER BY date DESC
    LIMIT 1
  `
  return rows[0]?.date ?? null
}
