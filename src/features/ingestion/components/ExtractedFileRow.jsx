import { useState } from 'react'
import { Button, Chip } from '@/components/ui'
import { getDocTypeLabel } from '@/constants/statusMaps'
import { FileTextPanel } from './FileTextPanel'

/**
 * Renders a single stored document row on Step 2 (Read Documents).
 * Displays document name, classification chip, pages/scan/table count, status chip,
 * and an inline retry box if text extraction failed.
 */
export function ExtractedFileRow({ row, onRetry, retrying = false, onOpen, opening = false }) {
  const [justRetried, setJustRetried] = useState(false)
  const [showText, setShowText] = useState(false)
  const canViewText = row.isReady
  const isPendingRetry = retrying && justRetried

  const handleRetryClick = () => {
    setJustRetried(true)
    onRetry?.(row)
  }

  const border = row.isFailed ? '1px solid var(--red)' : '1px solid var(--line)'

  return (
    <div
      style={{
        border,
        borderRadius: '8px',
        padding: '10px 12px',
        background: 'var(--panel)',
      }}
    >
      <div className="between" style={{ gap: '8px', alignItems: 'center' }}>
        <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <b style={{ overflowWrap: 'anywhere' }}>{row.name}</b>
          <Chip tone="teal">{getDocTypeLabel(row.classificationType).toUpperCase()}</Chip>
        </div>
        <div className="row" style={{ gap: '8px', alignItems: 'center', flexShrink: 0 }}>
          <span className="small muted mono">{row.pagesText}</span>
          <Chip tone={row.tone}>{row.chip}</Chip>
          {canViewText && (
            <Button size="sm" onClick={() => setShowText((v) => !v)} aria-expanded={showText}>
              {showText ? 'Hide text' : 'View text'}
            </Button>
          )}
          {onOpen && (
            <Button size="sm" loading={opening} onClick={() => onOpen(row.id)}>
              Open
            </Button>
          )}
        </div>
      </div>

      {showText && canViewText && <FileTextPanel fileId={row.id} />}

      {row.isFailed && (
        <div
          role="status"
          className="row"
          style={{
            marginTop: '8px',
            background: 'var(--red-bg)',
            borderRadius: '6px',
            padding: '7px 10px',
            fontSize: '13.5px',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ color: 'var(--red)', fontWeight: 600, flex: 1, minWidth: '200px' }}>
            {row.error}
          </span>
          {row.canRetry ? (
            <Button
              size="sm"
              variant="warn"
              loading={isPendingRetry}
              disabled={retrying}
              style={{ marginLeft: 'auto' }}
              onClick={handleRetryClick}
            >
              Try again
            </Button>
          ) : (
            <span className="small muted" style={{ marginLeft: 'auto' }}>
              Re-scan and upload again in step 1.
            </span>
          )}
        </div>
      )}
    </div>
  )
}

