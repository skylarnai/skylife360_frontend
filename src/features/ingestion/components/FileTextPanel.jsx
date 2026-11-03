import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button, ErrorBox } from '@/components/ui'
import { ingestionApi } from '../api/ingestionApi'
import { uploadErrorMessage } from '../utils/fileResultView'

/** The text read from one file, a page at a time (GET /files/{id}/text?page=). */
export function FileTextPanel({ fileId }) {
  const [page, setPage] = useState(1)
  const textQuery = useQuery({
    queryKey: ['file-text', fileId, page],
    queryFn: () => ingestionApi.getFileText(fileId, page),
    enabled: Boolean(fileId),
    placeholderData: (previous) => previous,
  })

  const data = textQuery.data
  const totalPages = data?.total_pages ?? 0

  if (textQuery.isError) {
    return <ErrorBox message={uploadErrorMessage(textQuery.error)} onRetry={() => textQuery.refetch()} />
  }

  return (
    <div style={{ display: 'grid', gap: '8px', marginTop: '8px' }}>
      <pre
        className="small"
        style={{
          margin: 0,
          maxHeight: '320px',
          overflow: 'auto',
          whiteSpace: 'pre-wrap',
          overflowWrap: 'anywhere',
          background: 'var(--soft)',
          border: '1px solid var(--line2)',
          borderRadius: '8px',
          padding: '10px 12px',
          fontFamily: 'var(--f-body)',
          opacity: textQuery.isFetching ? 0.6 : 1,
          transition: 'opacity 0.2s',
        }}
      >
        {textQuery.isLoading ? 'Loading text…' : data?.text?.trim() || 'No text was found on this page.'}
      </pre>
      {totalPages > 1 && (
        <div className="row" style={{ gap: '8px' }}>
          <Button size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            ← Prev
          </Button>
          <span className="small muted">
            Page {page} of {totalPages}
            {data?.has_ocr ? ' · read from a scan' : ''}
          </span>
          <Button size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next →
          </Button>
        </div>
      )}
    </div>
  )
}
