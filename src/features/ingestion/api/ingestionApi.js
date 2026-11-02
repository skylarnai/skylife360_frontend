import { httpClient } from '@/services/api/httpClient'

export const ingestionApi = {
  /**
   * POST /api/v1/ingestion/upload (READY)
   * multipart files[] + user_id, classification_type · Idempotency-Key header · 201 with batch_id
   */
  async upload({
    files = [],
    userId,
    classificationType,
    idempotencyKey,
    onUploadProgress,
  }) {
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
      timeout: 300_000,
      onUploadProgress,
    })
    return data
  },

  /**
   * GET /api/v1/ingestion/batches/{batch_id} (READY)
   * Batch status and per-file results
   */
  async getBatch(batchId) {
    const { data } = await httpClient.get(`/ingestion/batches/${batchId}`)
    return data
  },

  /**
   * GET /api/v1/ingestion/files/{file_id} (READY)
   * File status, pages, scanned pages
   */
  async getFile(fileId) {
    const { data } = await httpClient.get(`/ingestion/files/${fileId}`)
    return data
  },

  /**
   * POST /api/v1/ingestion/batches/{batch_id}/retry (READY)
   * Retry files that failed ({ file_ids?: string[] })
   */
  async retryBatch(batchId, fileIds) {
    const payload = Array.isArray(fileIds) && fileIds.length > 0 ? { file_ids: fileIds } : {}
    const { data } = await httpClient.post(`/ingestion/batches/${batchId}/retry`, payload)
    return data
  },

  /**
   * POST /api/v1/claims/{claim_id}/documents (NEEDED)
   * Link the uploaded batch to a claim
   */
  async linkBatchToClaim(claimId, batchId) {
    const { data } = await httpClient.post(`/claims/${claimId}/documents`, {
      batch_id: batchId,
    })
    return data
  },
}
