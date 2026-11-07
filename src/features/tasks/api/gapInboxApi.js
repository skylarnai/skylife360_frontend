import { httpClient } from '@/services/api/httpClient'

const enc = encodeURIComponent

/**
 * S08 My to-dos, Sent-back claims tab: the gap-report inbox (backend dev@4e426c0, task counts 49913f8).
 * Admins see every report in the tenant; doctors and staff only reports for the patients
 * granted to them (UserAccessGrant). A report outside that scope returns 404.
 */
export const gapInboxApi = {
  /**
   * GET /api/v1/claims/gap-reports?status=&page=&page_size= (READY)
   * status is repeatable: AVAILABLE | RESOLVED | GENERATING | REVOKED | FAILED. Newest first.
   * → { total, page, page_size, items: [{ gap_report_id, packet_id, claim_id, encounter_id, user_ids[],
   *      patient_name, status, hard_rejection_count, soft_gap_count, gap_count, resubmission_allowed,
   *      created_at, available_at, links_url, task_count, open_task_count }] }
   */
  async list({ status = ['AVAILABLE'], page = 1, pageSize = 20 } = {}) {
    const params = new URLSearchParams()
    status.forEach((s) => params.append('status', s))
    params.set('page', String(page))
    params.set('page_size', String(pageSize))
    const { data } = await httpClient.get(`/claims/gap-reports?${params.toString()}`)
    return data
  },

  /**
   * GET /api/v1/claims/gap-reports/{gap_report_id} (READY)
   * → { gap_report_id, packet_id, status, hard_rejection_count, soft_gap_count, resubmission_allowed,
   *      gap_summary: { [category]: count }, recipients, links_url, available_at, revoked_at, links_issued,
   *      task_count, open_task_count, tasks: [{ task_id, type, status, title, resolved_by, resolved_at }] }
   */
  async get(gapReportId) {
    const { data } = await httpClient.get(`/claims/gap-reports/${enc(gapReportId)}`)
    return data
  },
}
