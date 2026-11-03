import { httpClient } from '@/services/api/httpClient'

// Upload and retry run storage + text extraction inside the request, so big ZIPs take minutes.
const LONG_REQUEST_TIMEOUT_MS = 300_000

export const ingestionApi = {
  /**
   * POST /api/v1/ingestion/upload (READY)
   * multipart files[] + user_id (patient ID) + optional classification_type
   * Idempotency-Key header → 201 { batch_id, files: FileResult[], counts }
   */
  async upload({ files = [], userId, classificationType, idempotencyKey, onUploadProgress }) {
    const formData = new FormData()
    files.forEach((file) => {
      formData.append('files', file)
    })
    if (userId) {
      formData.append('user_id', userId)
    }
    if (classificationType) {
      formData.append('classification_type', classificationType)
    }

    const headers = {}
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey
    }

    const { data } = await httpClient.post('/ingestion/upload', formData, {
      headers,
      idempotent: true,
      timeout: LONG_REQUEST_TIMEOUT_MS,
      onUploadProgress,
    })
    return data
  },

  /**
   * GET /api/v1/ingestion/batches/{batch_id} (READY)
   * Same shape as upload + is_complete, created_at, updated_at
   */
  async getBatch(batchId) {
    const { data } = await httpClient.get(`/ingestion/batches/${encodeURIComponent(batchId)}`)
    return data
  },

  /**
   * GET /api/v1/ingestion/files/{file_id} (READY)
   * One file's status, storage location and timestamps
   */
  async getFile(fileId) {
    const { data } = await httpClient.get(`/ingestion/files/${encodeURIComponent(fileId)}`)
    return data
  },

  /**
   * POST /api/v1/ingestion/batches/{batch_id}/retry (READY)
   * multipart/form-data: repeat `file_ids` per file; omit to retry every eligible file.
   * → { batch_id, retried_file_ids, skipped_file_ids, files: FileResult[] }
   */
  async retryBatch(batchId, fileIds) {
    const formData = new FormData()
    if (Array.isArray(fileIds)) {
      fileIds.forEach((id) => formData.append('file_ids', id))
    }
    const { data } = await httpClient.post(
      `/ingestion/batches/${encodeURIComponent(batchId)}/retry`,
      formData,
      { timeout: LONG_REQUEST_TIMEOUT_MS }
    )
    return data
  },
}
