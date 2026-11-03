import { Lbl } from '@/components/ui'

export function SourcesList({ sources = [], citations = [] }) {
  if (!sources || sources.length === 0) return null

  // Map citation labels/filenames to 1-based index numbers
  const fileToNum = new Map()
  citations.forEach((c, idx) => {
    if (c.original_filename) {
      fileToNum.set(c.original_filename, idx + 1)
    }
  })

  return (
    <div style={{ display: 'grid', gap: '6px' }}>
      <Lbl>Sources</Lbl>
      {sources.map((src, idx) => {
        const citeNum = fileToNum.get(src.original_filename) || idx + 1
        const matchPct = src.relevance_score ? Math.round(src.relevance_score * 100) : null
        const isScanned = Boolean(src.has_ocr || src.classification_type === 'scanned')

        return (
          <div
            key={src.chunk_id || `${src.file_id}-${idx}`}
            className="row"
            style={{
              border: '1px solid var(--line)',
              borderRadius: '6px',
              padding: '7px 10px',
              fontSize: '13.5px',
              gap: '4px 12px',
              alignItems: 'center',
            }}
          >
            <span
              className="mono"
              style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent)' }}
            >
              [{citeNum}]
            </span>
            <b style={{ fontWeight: 600 }}>{src.original_filename}</b>
            <span className="muted">
              {src.page_number ? `Page ${src.page_number}` : 'Passage'}
              {isScanned ? ' · scanned' : ''}
              {matchPct !== null ? ` · ${matchPct}% match` : ''}
            </span>
          </div>
        )
      })}
    </div>
  )
}

