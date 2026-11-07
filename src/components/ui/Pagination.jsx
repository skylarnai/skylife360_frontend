import { Button } from './Button'

/**
 * Prev / Next pager under a table. `page` is 0-based. Hidden when everything fits on one page.
 * Works for server paging (limit/offset) and for slicing rows in the browser.
 */
export function Pagination({ page, pageSize, total, onChange, disabled = false, noun = 'items' }) {
  if (!total || total <= pageSize) return null
  const pageCount = Math.ceil(total / pageSize)
  const current = Math.min(page, pageCount - 1)
  const from = current * pageSize + 1
  const to = Math.min(total, from + pageSize - 1)

  return (
    <nav
      className="row"
      aria-label="Pages"
      style={{ gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}
    >
      <Button size="sm" disabled={current === 0 || disabled} onClick={() => onChange(current - 1)}>
        ← Prev
      </Button>
      <span className="small muted" aria-live="polite">
        {from}–{to} of {total} {noun} · page {current + 1} of {pageCount}
      </span>
      <Button
        size="sm"
        disabled={current + 1 >= pageCount || disabled}
        onClick={() => onChange(current + 1)}
      >
        Next →
      </Button>
    </nav>
  )
}
