import { useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { EmptyStep } from '@/components/common/EmptyStep'
import { Button, ErrorBox, Tile, TileGrid } from '@/components/ui'
import { ExtractedFileRow } from '@/features/ingestion/components/ExtractedFileRow'
import { useBatch } from '@/features/ingestion/hooks/useBatch'
import { useRetryFiles } from '@/features/ingestion/hooks/useRetryFiles'
import {
  toReadRows,
  toReadTiles,
  uploadErrorMessage,
} from '@/features/ingestion/utils/fileResultView'
import { useActivity } from '@/hooks/useActivity'
import { ASK_STEP_ENABLED } from '../constants'
import { useClaimDesk } from '../hooks/useClaimDesk'

export function ReadDocumentsStep() {
  const { claimId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { log } = useActivity()
  const { desk, updateDesk } = useClaimDesk(claimId)

  // Batch ID from URL query ?batch= or from desk store
  const batchId = searchParams.get('batch') || desk.batchId
  const batchQuery = useBatch(batchId)
  const retryMutation = useRetryFiles(batchId)

  // Sync batchId and uploaded flag into desk store if loaded from URL
  useEffect(() => {
    if (batchQuery.data && desk.batchId !== batchQuery.data.batch_id) {
      updateDesk({ uploaded: true, batchId: batchQuery.data.batch_id })
    }
  }, [batchQuery.data, desk.batchId, updateDesk])

  const files = batchQuery.data?.files || []
  const rows = toReadRows(files)
  const tiles = toReadTiles(files)

  const handleRetryFile = (fileId, fileName) => {
    if (!batchId || !fileId) return
    retryMutation.mutate([fileId], {
      onSuccess: (data) => {
        const retriedFile = data?.files?.find((f) => f.file_id === fileId)
        const isIndexed = retriedFile?.extraction?.status === 'INDEXED'
        if (isIndexed) {
          log(`${fileName} read on the second try`)
          updateDesk({ retried: true })
        } else {
          log(`${fileName} still couldn't be read`)
        }
      },
      onError: (err) => {
        log(`Failed to retry reading ${fileName}: ${err.message || 'Error'}`)
      },
    })
  }

  const nextStep = ASK_STEP_ENABLED ? 'ask' : 'gaps'

  const goToNextStep = () => {
    navigate(`/claims/${claimId}/${nextStep}${batchId ? `?batch=${encodeURIComponent(batchId)}` : ''}`)
  }

  if (!batchId) {
    return (
      <>
        <div className="between">
          <h2 style={{ fontSize: '18px' }}>Read the documents</h2>
          <span className="small muted">
            Text is pulled from every file, including scans, so it can be searched
          </span>
        </div>
        <EmptyStep
          message="Nothing uploaded yet."
          actionText="Go to step 1."
          to={`/claims/${claimId}/upload`}
        />
      </>
    )
  }

  return (
    <>
      <div className="between">
        <h2 style={{ fontSize: '18px' }}>Read the documents</h2>
        <span className="small muted">
          Text is pulled from every file, including scans, so it can be searched
        </span>
      </div>

      {batchQuery.isError && (
        <ErrorBox
          message={uploadErrorMessage(batchQuery.error)}
          onRetry={() => batchQuery.refetch()}
        />
      )}

      {retryMutation.isError && (
        <ErrorBox
          message={uploadErrorMessage(retryMutation.error) || 'Failed to retry reading document.'}
        />
      )}

      <TileGrid>
        {tiles.map((tile) => (
          <Tile
            key={tile.label}
            label={tile.label}
            value={batchQuery.isLoading ? '…' : tile.value}
          />
        ))}
      </TileGrid>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {batchQuery.isLoading && rows.length === 0 ? (
          <div className="muted small" style={{ padding: '16px 0' }}>
            Loading extracted documents…
          </div>
        ) : rows.length === 0 ? (
          <div className="muted small" style={{ padding: '16px 0' }}>
            No verified documents found in this batch.
          </div>
        ) : (
          rows.map((row) => (
            <ExtractedFileRow
              key={row.id}
              row={row}
              onRetry={handleRetryFile}
              retrying={retryMutation.isPending}
            />
          ))
        )}
      </div>

      <div className="row">
        <Button variant="pri" onClick={goToNextStep} disabled={batchQuery.isLoading}>
          {ASK_STEP_ENABLED ? 'Next: ask questions →' : 'Next: check gaps →'}
        </Button>
      </div>
    </>
  )
}
