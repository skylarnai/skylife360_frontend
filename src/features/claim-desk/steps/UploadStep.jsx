import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, ErrorBox, Note } from '@/components/ui'
import { PERMISSIONS } from '@/constants/permissions'
import {
  useClaimDocuments,
  useDeleteClaimDocument,
} from '@/features/claims/hooks/useClaimDocuments'
import { FileDropzone } from '@/features/ingestion/components/FileDropzone'
import { PickedFileList } from '@/features/ingestion/components/PickedFileList'
import { UploadProgress } from '@/features/ingestion/components/UploadProgress'
import { UploadResultsTable } from '@/features/ingestion/components/UploadResultsTable'
import { useOpenFile } from '@/features/ingestion/hooks/useOpenFile'
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
  const { log } = useActivity()
  const canUpload = usePermission(PERMISSIONS.FILES_UPLOAD)
  const canOpenOriginal = usePermission(PERMISSIONS.PHI_UNMASKED)
  const { claim, isLoadingClaim, updateDesk } = useClaimDesk(claimId)

  // Every document on the claim, across all uploads (GET /claims/{id}/documents).
  const documentsQuery = useClaimDocuments(claimId)
  const uploadMutation = useUploadBatch()
  const deleteMutation = useDeleteClaimDocument(claimId)
  const { openFile, openingId, error: openError } = useOpenFile()

  const [picked, setPicked] = useState([])
  const [addingMore, setAddingMore] = useState(false)

  const patientId = claim?.user_id || null
  const hasDocuments = (documentsQuery.data?.files?.length ?? 0) > 0
  const showPicker = canUpload && (addingMore || (!documentsQuery.isLoading && !hasDocuments))

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

  const handleRemovePicked = (file) => {
    const key = pickedFileKey(file)
    setPicked((current) => current.filter((f) => pickedFileKey(f) !== key))
    uploadMutation.startNewUpload()
  }

  const handleUpload = () => {
    if (!patientId || picked.length === 0 || tooMany || tooBig) return
    uploadMutation.mutate(
      { files: picked, userId: patientId, claimId },
      {
        onSuccess: (data) => {
          const counts = data.counts || {}
          setPicked([])
          setAddingMore(false)
          updateDesk({ uploaded: true, batchId: data.batch_id })
          log(
            `uploaded ${counts.successful ?? 0} file(s): ${counts.duplicate ?? 0} duplicate, ${counts.rejected ?? 0} not allowed`,
          )
        },
      },
    )
  }

  const handleRemoveDocument = (row) => {
    if (!window.confirm(`Remove ${row.name} from this claim?`)) return
    deleteMutation.mutate(row.id, {
      onSuccess: () => log(`removed ${row.name} from the claim`),
    })
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
            <PickedFileList files={picked} onRemove={handleRemovePicked} disabled={uploading} />
          </FileDropzone>

          {tooMany && (
            <Note>
              Up to {MAX_FILES_PER_BATCH} files per upload. Remove{' '}
              {picked.length - MAX_FILES_PER_BATCH} or put them in a ZIP.
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
            {hasDocuments && !uploading && (
              <Button
                onClick={() => {
                  setAddingMore(false)
                  setPicked([])
                  uploadMutation.startNewUpload()
                }}
              >
                Back to documents
              </Button>
            )}
            <span className="small muted">
              Files are stored securely; their text is read in the background.
            </span>
          </div>
        </>
      ) : documentsQuery.isError ? (
        <ErrorBox
          message={uploadErrorMessage(documentsQuery.error)}
          onRetry={() => documentsQuery.refetch()}
        />
      ) : hasDocuments || documentsQuery.isLoading ? (
        <>
          {(openError || deleteMutation.isError) && (
            <ErrorBox message={uploadErrorMessage(openError || deleteMutation.error)} />
          )}

          <UploadResultsTable
            batch={documentsQuery.data}
            loading={documentsQuery.isLoading}
            onOpen={canOpenOriginal ? (row) => openFile(row.id) : undefined}
            onRemove={canUpload ? handleRemoveDocument : undefined}
            openingId={openingId}
            removingId={deleteMutation.isPending ? deleteMutation.variables : null}
          />

          <div className="row">
            <Button
              variant="pri"
              disabled={!hasDocuments}
              onClick={() => navigate(`/claims/${claimId}/read`)}
            >
              Next: read documents →
            </Button>
            {canUpload && <Button onClick={() => setAddingMore(true)}>↺ Upload more</Button>}
          </div>
        </>
      ) : (
        <Note>
          Nothing has been uploaded for this claim yet, and you don't have permission to upload.
        </Note>
      )}
    </>
  )
}
