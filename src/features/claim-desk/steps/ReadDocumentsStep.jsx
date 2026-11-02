import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getDocTypeLabel, getFileStatusInfo } from '@/constants/statusMaps'
import { EmptyStep } from '@/components/common/EmptyStep'
import { Button, Chip, Tile, TileGrid } from '@/components/ui'
import { ingestionApi } from '@/features/ingestion/api/ingestionApi'
import { useActivity } from '@/hooks/useActivity'
import { useClaimDesk } from '../hooks/useClaimDesk'

export function ReadDocumentsStep() {
  const { claimId = 'SUV-261028-01' } = useParams()
  const navigate = useNavigate()
  const { log } = useActivity()
  const { desk, updateDesk } = useClaimDesk(claimId)
  const [retrying, setRetrying] = useState(false)

  const anFailed = !desk.retried

  const handleRetry = async () => {
    setRetrying(true)
    try {
      if (desk.batchId) {
        await ingestionApi.retryBatch(desk.batchId, ['f-1042-04'])
      }
    } catch {
      // Fallback to demo state when backend is offline
    } finally {
      setRetrying(false)
      updateDesk({ retried: true })
      log('anaesthesia_record.jpg read on the second try')
    }
  }

  const extractedFiles = [
    ['opd_consultation.pdf', 'admission', '2 pages', false],
    ['usg_abdomen.pdf', 'lab', '1 page', false],
    ['operation_note.pdf', 'operative', '2 pages', false],
    ['anaesthesia_record.jpg', 'operative', '1 page · scanned', anFailed],
    ['discharge_summary.pdf', 'discharge', '3 pages', false],
    ['final_bill.xlsx', 'billing', '2 sheets · 2 tables', false],
  ]

  const tiles = [
    ['files ready', anFailed ? '5 of 6' : '6 of 6'],
    ['pages read', anFailed ? '9' : '10'],
    ['scanned pages', anFailed ? '0' : '1'],
    ['tables kept', '2'],
  ]

  return (
    <>
      <div className="between">
        <h2 style={{ fontSize: '18px' }}>Read the documents</h2>
        <span className="small muted">
          Text is pulled from every file, including scans, so it can be searched
        </span>
      </div>

      {!desk.uploaded ? (
        <EmptyStep
          message="Nothing uploaded yet."
          actionText="Go to step 1."
          to={`/claims/${claimId}/upload`}
        />
      ) : (
        <>
          <TileGrid>
            {tiles.map(([label, value]) => (
              <Tile key={label} label={label} value={value} />
            ))}
          </TileGrid>

          {extractedFiles.map(([name, cls, pagesText, failed]) => {
            const statusInfo = getFileStatusInfo(failed ? 'EXTRACTION_FAILED' : 'INDEXED')
            return (
              <div
                key={name}
                style={{
                  border: `1px solid ${failed ? 'var(--red)' : 'var(--line)'}`,
                  borderRadius: '8px',
                  padding: '10px 12px',
                }}
              >
                <div className="between">
                  <div style={{ minWidth: 0 }}>
                    <b style={{ overflowWrap: 'anywhere' }}>{name}</b>{' '}
                    <Chip tone="teal">{getDocTypeLabel(cls).toUpperCase()}</Chip>
                  </div>
                  <span className="row" style={{ gap: '8px' }}>
                    <span className="small muted">{pagesText}</span>
                    <Chip tone={statusInfo.tone}>{statusInfo.label}</Chip>
                  </span>
                </div>

                {failed && (
                  <div
                    role="status"
                    className="row"
                    style={{
                      marginTop: '8px',
                      background: 'var(--red-bg)',
                      borderRadius: '6px',
                      padding: '7px 10px',
                      fontSize: '13.5px',
                    }}
                  >
                    <span style={{ color: 'var(--red)', fontWeight: 600 }}>
                      Reading the scan timed out. It can be tried again.
                    </span>
                    <Button
                      size="sm"
                      variant="warn"
                      loading={retrying}
                      style={{ marginLeft: 'auto' }}
                      onClick={handleRetry}
                    >
                      Try again
                    </Button>
                  </div>
                )}
              </div>
            )
          })}

          <div className="row">
            <Button variant="pri" onClick={() => navigate(`/claims/${claimId}/ask`)}>
              Next: ask questions →
            </Button>
          </div>
        </>
      )}
    </>
  )
}
