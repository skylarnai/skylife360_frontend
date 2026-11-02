import { httpClient } from '@/services/api/httpClient'

export const intakeApi = {
  /**
   * POST /api/v1/claims/intake/extract (READY)
   * Pre-fill claim fields from the documents (nothing created)
   */
  async extractFacts(payload) {
    const { data } = await httpClient.post('/claims/intake/extract', payload)
    return data
  },

  /**
   * POST /api/v1/claims/intake (READY)
   * Runs facts -> gaps -> packet -> queues integrity -> review
   */
  async createIntake(payload) {
    const { data } = await httpClient.post('/claims/intake', payload, {
      idempotent: true,
    })
    return data
  },

  /**
   * GET /api/v1/claims/intake/{intake_id} (READY)
   * Live pipeline status (packet, integrity run, review task, submission)
   */
  async getIntake(intakeId) {
    const { data } = await httpClient.get(`/claims/intake/${intakeId}`)
    return data
  },
}
