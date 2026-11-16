import { httpClient } from '@/services/api/httpClient'

const enc = encodeURIComponent

function clean(params) {
  return Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
  )
}

/**
 * S08 My to-dos: the hospital's tasks (backend dev@49913f8, N5–N7).
 * Scope is the patient's owner_scope: a doctor sees only granted patients' tasks (others are 404),
 * records staff and admins the whole hospital.
 */
export const tasksApi = {
  /**
   * N5 · GET /api/v1/tasks?assignee=me|pool|all&status=OPEN|DONE|CANCELLED|ALL&patient=&claim_id=
   *      &gap_report_id=&page=&page_size= (READY)
   * Open tasks first (oldest first). `open_count` = open tasks for the same filters (the badge).
   * → { total, open_count, page, page_size, items: TaskOut[] }
   */
  async list({
    assignee = 'me',
    status = 'OPEN',
    patient,
    claimId,
    gapReportId,
    page = 1,
    pageSize = 20,
  } = {}) {
    const { data } = await httpClient.get('/tasks', {
      params: clean({
        assignee,
        status,
        patient,
        claim_id: claimId,
        gap_report_id: gapReportId,
        page,
        page_size: pageSize,
      }),
    })
    return data
  },

  /**
   * N6 · POST /api/v1/tasks/{task_id}/resolve (READY, tasks:resolve)
   * body { note?, reply?, file_id? } · PAYER_QUERY needs reply, DOCUMENT needs file_id
   * (same patient, uploaded after the task).
   * 400 MISSING_REPLY | MISSING_FILE | INVALID_FILE · 404 · 409 TASK_ALREADY_RESOLVED
   */
  async resolve(taskId, { note, reply, fileId } = {}) {
    const { data } = await httpClient.post(
      `/tasks/${enc(taskId)}/resolve`,
      clean({ note, reply, file_id: fileId }),
    )
    return data
  },

  /**
   * N7 · POST /api/v1/tasks (READY, tasks:resolve or claims:approve)
   * body { type, user_id, claim_id?, title, detail?, file_id?, page?, assignee? }
   * 201 new task · 200 the existing open RESCAN for that file · 403 UNAUTHORIZED_USER · 400 INVALID_FILE
   */
  async create({ type, userId, claimId, title, detail, fileId, page, assignee }) {
    const { data } = await httpClient.post(
      '/tasks',
      clean({
        type,
        user_id: userId,
        claim_id: claimId,
        title,
        detail,
        file_id: fileId,
        page,
        assignee,
      }),
    )
    return data
  },
}
