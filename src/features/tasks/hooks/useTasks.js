import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { tasksApi } from '../api/tasksApi'

const TASKS_KEY = ['tasks', 'mine']

export function useTasks() {
  return useQuery({
    queryKey: TASKS_KEY,
    queryFn: () => tasksApi.listMyTasks(),
    select: ({ data, source }) => {
      const items = [...(data?.items || [])].sort((a, b) => {
        if (a.status !== b.status) return a.status === 'OPEN' ? -1 : 1
        return String(a.due_at || '').localeCompare(String(b.due_at || ''))
      })
      return { items, source }
    },
  })
}

/** Open to-do count for the tab badge. Shares the cache with useTasks. */
export function useOpenTaskCount(enabled = true) {
  const { data } = useQuery({
    queryKey: TASKS_KEY,
    queryFn: () => tasksApi.listMyTasks(),
    enabled,
    staleTime: 60_000,
    select: ({ data: d }) => (d?.items || []).filter((t) => t.status === 'OPEN').length,
  })
  return data ?? 0
}

export function useResolveTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, note, reply }) => tasksApi.resolveTask(taskId, { note, reply }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      // A resolved to-do can close a gap on the claim desk (S03.4).
      queryClient.invalidateQueries({ queryKey: ['gaps'] })
    },
  })
}

export function useCreateTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body) => tasksApi.createTask(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  })
}
