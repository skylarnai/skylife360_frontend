import { httpClient } from '@/services/api/httpClient'

export const gapsApi = {
  /**
   * POST /api/v1/claims/gaps/evaluate (READY)
   * facts, service_date, payer_id, chunk_references, billing · Idempotency-Key
   */
  async evaluate(payload) {
    const { data } = await httpClient.post('/claims/gaps/evaluate', payload, {
      idempotent: true,
    })
    return data
  },

  /**
   * GET /api/v1/claims/gaps/runs/{run_id} (READY)
   * Findings with source pages
   */
  async getRun(runId) {
    const { data } = await httpClient.get(`/claims/gaps/runs/${runId}`)
    return data
  },

  /**
   * GET /api/v1/claims/gaps/runs/{run_id}/report (READY)
   * Gap report download link
   */
  async getReportLink(runId) {
    const { data } = await httpClient.get(`/claims/gaps/runs/${runId}/report`)
    return data
  },

  /**
   * GET /api/v1/claims/registry/diseases (READY)
   * Diagnosis lookup
   */
  async searchDiseases(params = {}) {
    const { data } = await httpClient.get('/claims/registry/diseases', { params })
    return data
  },
}
