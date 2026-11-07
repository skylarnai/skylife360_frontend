import { Highlight } from '@/components/common'
import { Chip, DataTable } from '@/components/ui'
import { getDocTypeLabel, getFileStatusInfo } from '@/constants/statusMaps'
import { formatTableDate } from '@/utils/formatters'

export function DocumentsTable({ rows, loading, query, selectedId, onSelect, footer, note }) {
  if (!loading && rows.length === 0) {
    return (
      <div
        className="muted"
        style={{ border: '1px dashed var(--line)', borderRadius: '8px', padding: '16px' }}
      >
        No documents match. Clear a filter or try a shorter search.
      </div>
    )
  }

  const columns = [
    {
      key: 'name',
      header: 'DOCUMENT',
      render: (row) => (
        <>
          <b style={{ fontWeight: 600, overflowWrap: 'anywhere' }}>
            <Highlight text={row.original_filename} query={query} />
          </b>
          {row.match?.hit && (
            <div className="small muted" style={{ marginTop: '2px' }}>
              {row.match.hit.page_number ? `Page ${row.match.hit.page_number}` : 'Passage'}
              {row.match.hit.heading ? ` · ${row.match.hit.heading}` : ''}: “
              <Highlight text={row.match.hit.content} query={query} />”
            </div>
          )}
        </>
      ),
    },
    {
      key: 'patient',
      header: 'PATIENT',
      cellClassName: 'mono',
      render: (row) => (
        <span style={{ fontSize: '12.5px' }}>
          <Highlight text={row.user_id} query={query} />
        </span>
      ),
    },
    {
      key: 'type',
      header: 'TYPE',
      render: (row) => (
        <Chip tone="teal">{getDocTypeLabel(row.classification_type).toUpperCase()}</Chip>
      ),
    },
    {
      key: 'status',
      header: 'STATUS',
      render: (row) => {
        const info = getFileStatusInfo(row.status)
        return <Chip tone={info.tone}>{info.label}</Chip>
      },
    },
    {
      key: 'pages',
      header: 'PAGES',
      num: true,
      cellClassName: 'small',
      render: (row) => `${row.total_pages ?? '—'}${row.has_ocr ? ' · scanned' : ''}`,
    },
    {
      key: 'uploaded',
      header: 'UPLOADED',
      cellClassName: 'small muted',
      render: (row) => (
        <span style={{ whiteSpace: 'nowrap' }}>{formatTableDate(row.uploaded_at)}</span>
      ),
    },
  ]

  return (
    <div className="stack" style={{ gap: '8px' }}>
      {!loading && note && <div className="small muted">{note}</div>}
      <DataTable
        columns={columns}
        rows={rows}
        rowKey="file_id"
        loading={loading}
        minWidth={720}
        selectedRowId={selectedId}
        onRowClick={onSelect}
      />
      {footer}
    </div>
  )
}
