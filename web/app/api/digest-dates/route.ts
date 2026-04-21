import { NextRequest, NextResponse } from 'next/server'
import { DIGEST_PAGE_SIZE } from '@/lib/constants'
import { getDigestDates } from '@/lib/db'

export async function GET(req: NextRequest) {
  const raw = parseInt(req.nextUrl.searchParams.get('offset') ?? '0', 10)
  const offset = Number.isFinite(raw) ? Math.max(0, raw) : 0
  const dates = await getDigestDates(DIGEST_PAGE_SIZE, offset)
  return NextResponse.json(dates)
}
