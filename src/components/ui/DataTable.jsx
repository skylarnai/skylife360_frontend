import { cn } from '@/utils/cn'

export function DataTable({
  columns = [],
  rows = [],
  rowKey = 'id',
  selectedRowId = null,
  onRowClick = null,
  loading = false,
  skeletonRows = 4,
  emptyMessage = 'No records found.',
  minWidth = 640,
  className,
  tableClassName,
}) {
  const getKey = (row, index) => {
    if (typeof rowKey === 'function') return rowKey(row, index)
    return row?.[rowKey] ?? index
  }

  return (
    <div className={cn('tblw', className)}>
      <table className={tableClassName} style={minWidth ? { minWidth: `${minWidth}px` } : undefined}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key || col.header}
                className={cn(col.num && 'num', col.headerClassName)}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: skeletonRows }).map((_, rowIdx) => (
              <tr key={`skeleton-${rowIdx}`} aria-hidden="true">
                {columns.map((col, colIdx) => (
                  <td key={col.key || colIdx} className={cn(col.num && 'num')}>
                    <span className="inline-block h-4 w-full max-w-[160px] animate-pulse rounded bg-line2" />
                  </td>
                ))}
              </tr>
            ))
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={Math.max(columns.length, 1)} className="muted py-4 text-center">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, rowIndex) => {
              const id = getKey(row, rowIndex)
              const isClickable = typeof onRowClick === 'function'
              const isSelected = selectedRowId !== null && selectedRowId === id

              const handleKeyDown = (e) => {
                if (!isClickable) return
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onRowClick(row, rowIndex)
                }
              }

              return (
                <tr
                  key={id}
                  tabIndex={isClickable ? 0 : undefined}
                  role={isClickable ? 'button' : undefined}
                  aria-selected={isClickable ? isSelected : undefined}
                  className={cn(isClickable && 'click', isSelected && 'sel')}
                  onClick={isClickable ? () => onRowClick(row, rowIndex) : undefined}
                  onKeyDown={isClickable ? handleKeyDown : undefined}
                >
                  {columns.map((col) => {
                    const value = col.accessor ? row?.[col.accessor] : row?.[col.key]
                    return (
                      <td
                        key={col.key || col.header}
                        className={cn(col.num && 'num', col.cellClassName)}
                      >
                        {typeof col.render === 'function' ? col.render(row, value, rowIndex) : value}
                      </td>
                    )
                  })}
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}
