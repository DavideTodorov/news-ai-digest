import { EmptyState } from '@/components/empty-state'

export default function NotFound() {
  return (
    <EmptyState
      title="Няма такъв брой"
      body="Този източник не е публикувал обобщение за избраната дата."
      home
    />
  )
}
