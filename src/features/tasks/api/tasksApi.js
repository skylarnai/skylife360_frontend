import { httpClient, withMockFallback } from '@/services/api'
import { useSessionStore } from '@/store/sessionStore'
import { tasksMock } from './tasksApi.mock'

const enc = encodeURIComponent

export const tasksApi = {
  /**
   * GET /api/v1/tasks?assignee=me&status= (NEEDED)
   * → { total, counts: { open, done }, items: Task[] }
   */
  async listMyTasks({ status } = {}) {
    return withMockFallback(
      async () =>
        (
          await httpClient.get('/tasks', {
            params: { assignee: 'me', ...(status ? { status } : {}) },
          })
        ).data,
      () => tasksMock.list({ status }),
    )
  },

  /**
   * POST /api/v1/tasks/{task_id}/resolve (NEEDED)
   * { note?, reply? } → Task (status DONE, resolved_by, resolved_at)
   */
  async resolveTask(taskId, body = {}) {
    return withMockFallback(
      async () => (await httpClient.post(`/tasks/${enc(taskId)}/resolve`, body)).data,
      () => tasksMock.resolve(taskId, body, useSessionStore.getState().user?.name || 'You'),
    )
  },

  /**
   * POST /api/v1/tasks (NEEDED)
   * { type, title, description, user_id, claim_id?, source: { file_id, page_number? }, assignee_role? } → Task
   */
  async createTask(body) {
    return withMockFallback(
      async () => (await httpClient.post('/tasks', body)).data,
      () => tasksMock.create(body),
    )
  },
}
