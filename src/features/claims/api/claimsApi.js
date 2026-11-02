import { httpClient } from '@/services/api/httpClient'
import { MOCK_CLAIMS, MOCK_WORKLIST_SUMMARY } from './claimsApi.mock'

export const claimsApi = {
  /**
   * GET /api/v1/claims?stage=&payer=&q=&limit=&offset= (NEEDED)
   * Falls back to MOCK_CLAIMS until backend endpoint is added.
   */
  async getClaims(params = {}) {
    try {
      const { data } = await httpClient.get('/claims', { params })
      return data
    } catch {
      let items = [...MOCK_CLAIMS]
      if (params.stage && params.stage !== 'all') {
        items = items.filter((c) => c.stage === params.stage)
      }
      if (params.q) {
        const q = String(params.q).toLowerCase()
        items = items.filter(
          (c) =>
            c.claim_id.toLowerCase().includes(q) ||
            c.user_id.toLowerCase().includes(q) ||
            c.procedure_name.toLowerCase().includes(q)
        )
      }
      return {
        total: items.length,
        items,
        summary: MOCK_WORKLIST_SUMMARY,
      }
    }
  },

  /**
   * GET /api/v1/claims/{claim_id} (NEEDED)
   */
  async getClaimById(claimId) {
    try {
      const { data } = await httpClient.get(`/claims/${claimId}`)
      return data
    } catch {
      return (
        MOCK_CLAIMS.find((c) => c.claim_id === claimId) || MOCK_CLAIMS[0]
      )
    }
  },

  /**
   * POST /api/v1/claims (NEEDED)
   */
  async createClaim(payload) {
    const { data } = await httpClient.post('/claims', payload)
    return data
  },

  /**
   * GET /api/v1/claims/intake/{intake_id} (READY)
   */
  async getIntake(intakeId) {
    const { data } = await httpClient.get(`/claims/intake/${intakeId}`)
    return data
  },

  /**
   * GET /api/v1/reviews/pending (READY)
   */
  async getPendingReviews(params = { limit: 1, offset: 0 }) {
    try {
      const { data } = await httpClient.get('/reviews/pending', { params })
      return data
    } catch {
      return { total: MOCK_WORKLIST_SUMMARY.awaiting_approval, items: [] }
    }
  },

  /**
   * GET /api/v1/claims/submissions (READY)
   */
  async getSubmissions(params = {}) {
    try {
      const { data } = await httpClient.get('/claims/submissions', { params })
      return data
    } catch {
      return { total: MOCK_WORKLIST_SUMMARY.settled_this_week, items: [] }
    }
  },
}
