# Sidebar Pagination — Implementation Plan

Load 30 dates initially in the sidebar, with a "Load more" button to fetch older entries.

## Files to change

### 1. `web/lib/db.ts` — paginate `getDigestDates`

Add `limit` and `offset` params:

```ts
export async function getDigestDates(limit = 30, offset = 0): Promise<DigestDate[]> {
  const rows = await sql<{ date: string; sources: string[] }[]>`
    SELECT date::text, array_agg(source ORDER BY source) AS sources
    FROM digests
    GROUP BY date
    ORDER BY date DESC
    LIMIT ${limit} OFFSET ${offset}
  `
  return rows
}
```

Also add a count query to know if there are more pages:

```ts
export async function getDigestCount(): Promise<number> {
  const rows = await sql<{ count: string }[]>`SELECT COUNT(DISTINCT date) FROM digests`
  return parseInt(rows[0].count)
}
```

---

### 2. `web/app/api/digest-dates/route.ts` — new API route

Accepts `?offset=N`, returns JSON array of `DigestDate`.

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getDigestDates } from '@/lib/db'

export async function GET(req: NextRequest) {
  const offset = parseInt(req.nextUrl.searchParams.get('offset') ?? '0')
  const dates = await getDigestDates(30, offset)
  return NextResponse.json(dates)
}
```

---

### 3. `web/components/sidebar.tsx` — split into server shell + client list

Extract the dates list into a new `SidebarDateList` client component:

- Accepts `initialDates: DigestDate[]` and `hasMore: boolean` as props
- Holds `useState` for accumulated dates and a loading flag
- "Load more" button calls `/api/digest-dates?offset=N` and appends results

Keep the `Sidebar` server component as the outer shell, passing `initialDates` and `hasMore` down.

---

### 4. `web/app/[source]/[date]/page.tsx` — handle the current-date edge case

The page uses `dates.find(d => d.date === date)` to determine which source tabs are available for the current date. If the user navigates to an old date outside the first 30, it won't be in `initialDates`.

Fix: fetch the current date's entry separately alongside `getDigestContent`:

```ts
const [content, initialDates, totalCount] = await Promise.all([
  getDigestContent(date, source),
  getDigestDates(30, 0),
  getDigestCount(),
])

// Always include current date entry for the tab indicator
const dateEntry = initialDates.find(d => d.date === date)
  ?? await getDigestDates(1, 0).then(() => /* fetch specific date entry */)
```

A simpler alternative: add a `getDigestEntry(date)` helper that fetches sources for a single date.

---

## Order of implementation

1. Update `getDigestDates` in `db.ts` + add `getDigestCount`
2. Create `/api/digest-dates/route.ts`
3. Create `SidebarDateList` client component
4. Update `Sidebar` to use `SidebarDateList`
5. Update `page.tsx` to pass `hasMore` and handle the edge case