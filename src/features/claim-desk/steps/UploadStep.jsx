import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Button, ErrorBox, Note } from '@/components/ui'
import { PERMISSIONS } from '@/constants/permissions'
import { FileDropzone } from '@/features/ingestion/components/FileDropzone'
import { PickedFileList } from '@/features/ingestion/components/PickedFileList'
import { UploadProgress } from '@/features/ingestion/components/UploadProgress'
import { UploadResultsTable } from '@/features/ingestion/components/UploadResultsTable'
import { useBatch } from '@/features/ingestion/hooks/useBatch'
import { useUploadBatch } from '@/features/ingestion/hooks/useUploadBatch'
import {
  MAX_BATCH_BYTES,
  MAX_FILES_PER_BATCH,
  pickedFileKey,
  uploadErrorMessage,
} from '@/features/ingestion/utils/fileResultView'
import { useActivity } from '@/hooks/useActivity'
import { usePermission } from '@/hooks/usePermission'
import { useClaimDesk } from '../hooks/useClaimDesk'

export function UploadStep() {
  const { claimId } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { log } = useActivity()
  const canUpload = usePermission(PERMISSIONS.FILES_UPLOAD)
  const { claim, isLoadingClaim, desk, updateDesk } = useClaimDesk(claimId)

  // The batch lives in the URL (?batch=) so a refresh can reload it (no claim ↔ batch link in the API yet).
  const batchId = searchParams.get('batch') || desk.batchId
  const batchQuery = useBatch(batchId)
  const uploadMutation = useUploadBatch()

  const [picked, setPicked] = useState([])
  const [addingMore, setAddingMore] = useState(false)

  const patientId = claim?.user_id || null
  const showPicker = canUpload && (!batchId || addingMore)

  // Keep the desk store in step with a batch reloaded from the URL (later steps still read it).
  useEffect(() => {
    if (batchQuery.data && desk.batchId !== batchQuery.data.batch_id) {
      updateDesk({ uploaded: true, batchId: batchQuery.data.batch_id })
    }
  }, [batchQuery.data, desk.batchId, updateDesk])

  const totalBytes = picked.reduce((sum, file) => sum + file.size, 0)
  const tooMany = picked.length > MAX_FILES_PER_BATCH
  const tooBig = totalBytes > MAX_BATCH_BYTES
  const uploading = uploadMutation.isPending

  const handleFilesAdded = (files) => {
    setPicked((current) => {
      const seen = new Set(current.map(pickedFileKey))
      return [...current, ...files.filter((file) => !seen.has(pickedFileKey(file)))]
    })
    uploadMutation.startNewUpload()
  }

  const handleRemove = (file) => {
    const key = pickedFileKey(file)
    setPicked((current) => current.filter((f) => pickedFileKey(f) !== key))
    uploadMutation.startNewUpload()
  }

  const handleUpload = () => {
    if (!patientId || picked.length === 0 || tooMany || tooBig) return
    uploadMutation.mutate(
      { files: picked, userId: patientId },
      {
        onSuccess: (data) => {
          const counts = data.counts || {}
          setPicked([])
          setAddingMore(false)
          setSearchParams({ batch: data.batch_id })
          updateDesk({ uploaded: true, batchId: data.batch_id })
          log(
            `uploaded batch: ${counts.successful ?? 0} ingested, ${counts.duplicate ?? 0} duplicate, ${counts.rejected ?? 0} rejected`
          )
        },
      }
    )
  }

  const goToRead = () => {
    navigate(`/claims/${claimId}/read${batchId ? `?batch=${encodeURIComponent(batchId)}` : ''}`)
  }

  return (
    <>
      <div className="between">
        <h2 style={{ fontSize: '18px' }}>Upload claim documents</h2>
        {patientId && <span className="small muted">Patient {patientId}</span>}
      </div>

      {showPicker ? (
        <>
          {!isLoadingClaim && !patientId && (
            <ErrorBox message="This claim has no patient ID, so documents can't be uploaded for it yet." />
          )}

          <FileDropzone onFilesAdded={handleFilesAdded} disabled={uploading}>
            <PickedFileList files={picked} onRemove={handleRemove} disabled={uploading} />
          </FileDropzone>

          {tooMany && (
            <Note>
              Up to {MAX_FILES_PER_BATCH} files per upload. Remove {picked.length - MAX_FILES_PER_BATCH}{' '}
              or put them in a ZIP.
            </Note>
          )}
          {tooBig && <Note>This upload is over 500 MB. Split it into smaller batches.</Note>}

          {uploading && <UploadProgress progress={uploadMutation.progress} />}

          {uploadMutation.isError && (
            <ErrorBox
              message={uploadErrorMessage(uploadMutation.error)}
              onRetry={handleUpload}
              retryLabel="Try again"
            />
          )}

          <div className="row">
            <Button
              variant="acc"
              loading={uploading}
              disabled={!patientId || picked.length === 0 || tooMany || tooBig}
              onClick={handleUpload}
            >
              {picked.length === 1 ? 'Upload 1 item' : `Upload ${picked.length} items`}
            </Button>
            {batchId && !uploading && (
              <Button
                onClick={() => {
                  setAddingMore(false)
                  setPicked([])
                  uploadMutation.startNewUpload()
                }}
              >
                Back to results
              </Button>
            )}
            <span className="small muted">
              Files are stored securely and read automatically after upload.
            </span>
          </div>
        </>
      ) : batchId ? (
        <>
          {batchQuery.isError ? (
            <ErrorBox
              message={uploadErrorMessage(batchQuery.error)}
              onRetry={() => batchQuery.refetch()}
            />
          ) : (
            <UploadResultsTable batch={batchQuery.data} loading={batchQuery.isLoading} />
          )}

          <div className="row">
            <Button variant="pri" disabled={!batchQuery.data} onClick={goToRead}>
              Next: read documents →
            </Button>
            {canUpload && <Button onClick={() => setAddingMore(true)}>↺ Upload more</Button>}
          </div>
        </>
      ) : (
        <Note>Nothing has been uploaded for this claim yet, and you don't have permission to upload.</Note>
      )}
    </>
  )
}
