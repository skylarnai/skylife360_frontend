import { useRef } from 'react'

/** Page numbers to show: first, last, and the current one with a neighbour each side; gaps become "…". */
function pageWindow(current, pageCount) {
  const pages = new Set([0, pageCount - 1, current - 1, current, current + 1])
  const sorted = [...pages].filter((p) => p >= 0 && p < pageCount).sort((a, b) => a - b)
  const out = []
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push(`gap-${p}`)
    out.push(p)
  })
  return out
}

/** The list or table this pager belongs to: the nearest earlier sibling (or its .tblw inside). */
function findTarget(nav) {
  let el = nav?.previousElementSibling
  while (el) {
    const table = el.matches('.tblw') ? el : el.querySelector('.tblw')
    if (table) return table
    if (el.offsetHeight > 0) return el
    el = el.previousElementSibling
  }
  return null
}

/**
 * Pager under a table or list. `page` is 0-based. Hidden when everything fits on one page.
 * Works for server paging (limit/offset) and for slicing rows in the browser.
 * Changing page scrolls the table back to its first row and brings it into view, smoothly.
 */
export function Pagination({ page, pageSize, total, onChange, disabled = false, noun = 'items' }) {
  const navRef = useRef(null)
  if (!total || total <= pageSize) return null
  const pageCount = Math.ceil(total / pageSize)
  const current = Math.min(page, pageCount - 1)
  const from = current * pageSize + 1
  const to = Math.min(total, from + pageSize - 1)

  const go = (next) => {
    if (next === current || next < 0 || next >= pageCount) return
    onChange(next)
    const target = findTarget(navRef.current)
    if (!target) return
    if (target.matches('.tblw')) target.scrollTo({ top: 0, behavior: 'smooth' })
    if (target.getBoundingClientRect().top < 0) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <nav ref={navRef} className="pager" aria-label="Pages">
      <span className="pager-info" aria-live="polite">
        Showing{' '}
        <b>
          {from}–{to}
        </b>{' '}
        of <b>{total}</b> {noun}
      </span>
      <div className="pager-btns">
        <button
          type="button"
          className="pg"
          disabled={current === 0 || disabled}
          onClick={() => go(current - 1)}
          aria-label="Previous page"
        >
          ‹ Prev
        </button>
        {pageWindow(current, pageCount).map((p) =>
          typeof p === 'string' ? (
            <span key={p} className="pg-gap" aria-hidden="true">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              className="pg num"
              aria-current={p === current ? 'page' : undefined}
              aria-label={`Page ${p + 1}`}
              disabled={disabled && p !== current}
              onClick={() => go(p)}
            >
              {p + 1}
            </button>
          ),
        )}
        <button
          type="button"
          className="pg"
          disabled={current + 1 >= pageCount || disabled}
          onClick={() => go(current + 1)}
          aria-label="Next page"
        >
          Next ›
        </button>
      </div>
    </nav>
  )
}
