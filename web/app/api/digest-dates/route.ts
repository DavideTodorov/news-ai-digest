import { NextRequest, NextResponse } from 'next/server'
import { getDigestDates } from '@/lib/db'

export async function GET(req: NextRequest) {
  const offset = parseInt(req.nextUrl.searchParams.get('offset') ?? '0')
  const dates = await getDigestDates(30, offset)
  return NextResponse.json(dates)
}
