import { httpClient } from '@/services/api/httpClient'

export const reviewsApi = {
  /**
   * POST /api/v1/reviews (READY)
   * { packet_id } opens the review task
   */
  async openReviewTask(packetId) {
    const { data } = await httpClient.post('/reviews', {
      packet_id: packetId,
    })
    return data
  },

  /**
   * GET /api/v1/reviews/{task_id} (READY)
   * Task detail incl. version, blockers, flags, integrity_checks, rationale_min_chars
   */
  async getTask(taskId) {
    const { data } = await httpClient.get(`/reviews/${taskId}`)
    return data
  },

  /**
   * POST /api/v1/reviews/{task_id}/integrity-clearance (READY)
   */
  async clearIntegrityFlags(taskId, payload) {
    const { data } = await httpClient.post(`/reviews/${taskId}/integrity-clearance`, payload)
    return data
  },

  /**
   * POST /api/v1/reviews/{task_id}/adjudicate (READY)
   * { version, decision, rationale, false_positive_checks, gap_report_recipients } · stale version -> 409
   */
  async adjudicate(taskId, payload) {
    const { data } = await httpClient.post(`/reviews/${taskId}/adjudicate`, payload)
    return data
  },
}
