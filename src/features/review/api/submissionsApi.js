import { httpClient } from '@/services/api/httpClient'

export const submissionsApi = {
  /**
   * POST /api/v1/claims/submissions (READY)
   * { packet_id } · 202 · QUEUED -> DISPATCHING -> SUBMITTED
   */
  async createSubmission(packetId) {
    const { data } = await httpClient.post(
      '/claims/submissions',
      { packet_id: packetId },
      { idempotent: true }
    )
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
   */
  async requeue(submissionId) {
    const { data } = await httpClient.post(`/claims/submissions/${submissionId}/requeue`)
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
