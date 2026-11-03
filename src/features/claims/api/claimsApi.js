import { httpClient } from '@/services/api/httpClient'

const enc = encodeURIComponent

export const claimsApi = {
  /**
   * GET /api/v1/claims?stage=&payer=&q=&limit=&offset= (READY)
   * → { total, items: ClaimItem[], summary: { open_claims, awaiting_approval, items_to_fix, settled_this_week } }
   */
  async getClaims(params = {}) {
    const query = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '' && v !== 'all')
    )
    const { data } = await httpClient.get('/claims', { params: query })
    return data
  },

  /**
   * GET /api/v1/claims/{claim_id} (READY)
   * Claim header: patient, payer, scheme, stage, document_counts. 404 NOT_FOUND / 403 ACCESS_DENIED.
   */
  async getClaimById(claimId) {
    const { data } = await httpClient.get(`/claims/${enc(claimId)}`)
    return data
  },

  /**
   * POST /api/v1/claims (READY)
   * Creates the claim and grants the patient to this tenant. 409 CLAIM_ALREADY_EXISTS.
   */
  async createClaim(payload) {
    const { data } = await httpClient.post('/claims', payload)
    return data
  },

  /**
   * GET /api/v1/claims/{claim_id}/documents (READY)
   * Every file linked to the claim across uploads:
   * → { claim_id, is_complete, counts, batches: [{batch_id, created_at, file_count}], files: (FileResult & {batch_id})[] }
   */
  async getClaimDocuments(claimId) {
    const { data } = await httpClient.get(`/claims/${enc(claimId)}/documents`)
    return data
  },

  /**
   * DELETE /api/v1/claims/{claim_id}/documents/{file_id} (READY)
   * Removes a file from the claim (soft delete, audited). 204. Needs files:upload.
   */
  async deleteClaimDocument(claimId, fileId) {
    await httpClient.delete(`/claims/${enc(claimId)}/documents/${enc(fileId)}`)
  },

  /**
   * GET /api/v1/claims/intake/{intake_id} (READY)
   */
  async getIntake(intakeId) {
    const { data } = await httpClient.get(`/claims/intake/${enc(intakeId)}`)
    return data
  },

  /**
   * GET /api/v1/reviews/pending (READY)
   */
  async getPendingReviews(params = { limit: 1, offset: 0 }) {
    const { data } = await httpClient.get('/reviews/pending', { params })
    return data
  },

  /**
   * GET /api/v1/claims/submissions (READY)
   */
  async getSubmissions(params = {}) {
    const { data } = await httpClient.get('/claims/submissions', { params })
    return data
  },
}
