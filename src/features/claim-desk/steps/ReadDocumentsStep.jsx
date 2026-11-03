import { useNavigate, useParams } from 'react-router-dom'
import { EmptyStep } from '@/components/common/EmptyStep'
import { Button, ErrorBox, Tile, TileGrid } from '@/components/ui'
import { useClaimDocuments } from '@/features/claims/hooks/useClaimDocuments'
import { ExtractedFileRow } from '@/features/ingestion/components/ExtractedFileRow'
import { isBatchBusy } from '@/features/ingestion/hooks/useBatch'
import { useOpenFile } from '@/features/ingestion/hooks/useOpenFile'
import { useRetryFiles } from '@/features/ingestion/hooks/useRetryFiles'
import {
  toReadRows,
  toReadTiles,
  uploadErrorMessage,
} from '@/features/ingestion/utils/fileResultView'
import { useActivity } from '@/hooks/useActivity'
import { ASK_STEP_ENABLED } from '../constants'
import { useClaimDesk } from '../hooks/useClaimDesk'

const STEP_HEADER = (
  <div className="between">
    <h2 style={{ fontSize: '18px' }}>Read the documents</h2>
    <span className="small muted">
      Text is pulled from every file, including scans, so it can be searched
    </span>
  </div>
)

export function ReadDocumentsStep() {
  const { claimId } = useParams()
  const navigate = useNavigate()
  const { log } = useActivity()
  const { updateDesk } = useClaimDesk(claimId)

  // All documents on the claim; polls while text is still being read in the background.
  const documentsQuery = useClaimDocuments(claimId)
  const retryMutation = useRetryFiles(claimId)
  const { openFile, openingId, error: openError } = useOpenFile()

  const files = documentsQuery.data?.files || []
  const rows = toReadRows(files)
  const tiles = toReadTiles(files)
  const stillReading = isBatchBusy(documentsQuery.data)

  const handleRetryFile = (row) => {
    if (!row.batchId) return
    retryMutation.mutate(
      { batchId: row.batchId, fileIds: [row.id] },
      {
        onSuccess: (data) => {
          const retried = data?.retried_file_ids?.includes(row.id)
          log(retried ? `reading ${row.name} again` : `${row.name} can't be retried`)
          if (retried) updateDesk({ retried: true })
        },
        onError: (err) => log(`couldn't retry ${row.name}: ${err.message || 'error'}`),
      }
    )
  }

  const nextStep = ASK_STEP_ENABLED ? 'ask' : 'gaps'

  if (!documentsQuery.isLoading && !documentsQuery.isError && files.length === 0) {
    return (
      <>
        {STEP_HEADER}
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
      {STEP_HEADER}

      {documentsQuery.isError && (
        <ErrorBox
          message={uploadErrorMessage(documentsQuery.error)}
          onRetry={() => documentsQuery.refetch()}
        />
      )}

      {(retryMutation.isError || openError) && (
        <ErrorBox message={uploadErrorMessage(retryMutation.error || openError)} />
      )}

      <TileGrid>
        {tiles.map((tile) => (
          <Tile
            key={tile.label}
            label={tile.label}
            value={documentsQuery.isLoading ? '…' : tile.value}
          />
        ))}
      </TileGrid>

      {stillReading && (
        <div className="small muted">Still reading some files. This page updates on its own.</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {documentsQuery.isLoading ? (
          <div className="muted small" style={{ padding: '16px 0' }}>
            Loading documents…
          </div>
        ) : rows.length === 0 ? (
          <div className="muted small" style={{ padding: '16px 0' }}>
            No stored documents on this claim. Files that were rejected or duplicates are listed in
            step 1.
          </div>
        ) : (
          rows.map((row) => (
            <ExtractedFileRow
              key={row.id}
              row={row}
              onRetry={handleRetryFile}
              retrying={retryMutation.isPending}
              onOpen={openFile}
              opening={openingId === row.id}
            />
          ))
        )}
      </div>

      <div className="row">
        <Button
          variant="pri"
          onClick={() => navigate(`/claims/${claimId}/${nextStep}`)}
          disabled={documentsQuery.isLoading}
        >
          {ASK_STEP_ENABLED ? 'Next: ask questions →' : 'Next: check gaps →'}
        </Button>
      </div>
    </>
  )
}
