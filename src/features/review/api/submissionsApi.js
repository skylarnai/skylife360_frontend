import { httpClient } from '@/services/api/httpClient'

export const submissionsApi = {
  /**
   * POST /api/v1/claims/submissions (READY)
   * { packet_id, claim_type?, admission_date?, discharge_date?, preauth_ref?, documents?[],
   *   mock_scenario? (admin, mock payers only) } · 202 · QUEUED -> DISPATCHING -> SUBMITTED
   * Accepts a packet ID or the full body.
   */
  async createSubmission(packetIdOrBody) {
    const body =
      typeof packetIdOrBody === 'string' ? { packet_id: packetIdOrBody } : packetIdOrBody
    const { data } = await httpClient.post('/claims/submissions', body, { idempotent: true })
    return data
  },

  /**
   * GET /api/v1/claims/submissions/{submission_id} (READY)
   * Status and payer attempts
   */
  async getSubmission(submissionId) {
    const { data } = await httpClient.get(`/claims/submissions/${submissionId}`)
    return data
  },

  /**
   * POST /api/v1/claims/submissions/{submission_id}/requeue (READY)
   * { reason } (required, 1-2000 chars) · only DEAD_LETTERED submissions · 202
   */
  async requeue(submissionId, reason) {
    const { data } = await httpClient.post(`/claims/submissions/${submissionId}/requeue`, { reason })
    return data
  },

  /**
   * POST /api/v1/claims/submissions/{submission_id}/document-link (READY)
   */
  async getDocumentLink(submissionId) {
    const { data } = await httpClient.post(`/claims/submissions/${submissionId}/document-link`)
    return data
  },

  /**
   * GET /api/v1/claims/gap-reports/{gap_report_id} (READY)
   * Report sent back to the hospital
   */
  async getGapReport(gapReportId) {
    const { data } = await httpClient.get(`/claims/gap-reports/${gapReportId}`)
    return data
  },
}
