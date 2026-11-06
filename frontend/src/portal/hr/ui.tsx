import { useEffect, useState } from 'react'
import { Button, Icon } from '../../MsuPayroll'

/** Client-side paging that resets to page 1 whenever the filtered list or its filters change. */
export function usePaged<T>(items: T[], size: number, resetKey: string) {
  const [page, setPage] = useState(1)
  const pages = Math.max(1, Math.ceil(items.length / size))
  useEffect(() => { setPage(1) }, [resetKey])
  const current = Math.min(page, pages)
  return { page: current, pages, setPage, visible: items.slice((current - 1) * size, current * size), total: items.length, size }
}

export function Pagination({ page, pages, total, size, onPage }: { page: number; pages: number; total: number; size: number; onPage: (page: number) => void }) {
  if (total <= size) return null
  const from = (page - 1) * size + 1
  const to = Math.min(total, page * size)
  return (
    <nav aria-label="Pagination" className="flex flex-col gap-3 border-t border-border px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-text-muted" aria-live="polite">Showing {from}–{to} of {total}</p>
      <div className="flex items-center gap-2">
        <Button type="button" variant="secondary" onClick={() => onPage(page - 1)} disabled={page <= 1} className="h-10"><Icon name="arrowLeft" size={15} /> Previous</Button>
        <span className="text-xs font-medium text-text-muted">Page {page} of {pages}</span>
        <Button type="button" variant="secondary" onClick={() => onPage(page + 1)} disabled={page >= pages} className="h-10">Next <Icon name="arrowRight" size={15} /></Button>
      </div>
    </nav>
  )
}
