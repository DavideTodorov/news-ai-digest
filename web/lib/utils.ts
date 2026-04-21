export function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export function parseDateline(dateStr: string): {
  weekday: string
  dayMonth: string
  year: number
} {
  const date = new Date(dateStr + 'T00:00:00')
  return {
    weekday: date.toLocaleDateString('en-GB', { weekday: 'long' }),
    dayMonth: date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }),
    year: date.getFullYear(),
  }
}
