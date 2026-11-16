import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { tasksApi } from '../api/tasksApi'

/** Every tasks query starts with this key, so one invalidation refreshes the list and the badge. */
export const TASKS_KEY = ['tasks']

/** N5: the caller's to-dos. */
export function useTasks({ assignee = 'me', status = 'OPEN', page = 1, pageSize = 20 } = {}) {
  return useQuery({
    queryKey: [...TASKS_KEY, 'list', assignee, status, page, pageSize],
    queryFn: () => tasksApi.list({ assignee, status, page, pageSize }),
    placeholderData: (previous) => previous,
  })
}

/** Tab badge: `open_count` of the caller's own to-dos (assigned to them or their role's pool). */
export function useOpenTaskCount(enabled = true) {
  const { data } = useQuery({
    queryKey: [...TASKS_KEY, 'count'],
    queryFn: () => tasksApi.list({ assignee: 'me', status: 'OPEN', page: 1, pageSize: 1 }),
    enabled,
    staleTime: 60_000,
    select: (d) => d?.open_count ?? 0,
  })
  return data ?? 0
}

function useRefreshAfterTaskChange() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: TASKS_KEY })
    // Resolving updates the gap report (task counts, RESOLVED) and the gap findings (FIXED).
    queryClient.invalidateQueries({ queryKey: ['gap-inbox'] })
    queryClient.invalidateQueries({ queryKey: ['gap-report'] })
    queryClient.invalidateQueries({ queryKey: ['gaps-run'] })
  }
}

/** N6: resolve a task. On 409 TASK_ALREADY_RESOLVED the list is refreshed too. */
export function useResolveTask() {
  const refresh = useRefreshAfterTaskChange()
  return useMutation({
    mutationFn: ({ taskId, note, reply, fileId }) =>
      tasksApi.resolve(taskId, { note, reply, fileId }),
    onSettled: refresh,
  })
}

/** N7: create a task (S05 Request re-scan). */
export function useCreateTask() {
  const refresh = useRefreshAfterTaskChange()
  return useMutation({
    mutationFn: (body) => tasksApi.create(body),
    onSuccess: refresh,
  })
}
