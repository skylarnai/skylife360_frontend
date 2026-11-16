import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { reviewsApi } from '../api/reviewsApi'

export const reviewTaskQueryKey = (taskId) => ['review-task', taskId]

/**
 * Loads a Review Task by ID.
 * openTask(packetId) calls POST /reviews, which returns the packet's existing task (200)
 * or opens one (201); the returned detail is seeded into the cache under its task_id.
 */
export function useReviewTask(taskId) {
  const queryClient = useQueryClient()

  const taskQuery = useQuery({
    queryKey: reviewTaskQueryKey(taskId),
    queryFn: () => reviewsApi.getTask(taskId),
    enabled: Boolean(taskId),
  })

  const seedTask = (data) => {
    if (data?.task_id) {
      queryClient.setQueryData(reviewTaskQueryKey(data.task_id), data)
    }
  }

  const openTaskMutation = useMutation({
    mutationFn: (packetId) => reviewsApi.openReviewTask(packetId),
    onSuccess: seedTask,
  })

  const adjudicateMutation = useMutation({
    mutationFn: ({ taskId: targetTaskId, payload }) =>
      reviewsApi.adjudicate(targetTaskId || taskId, payload),
    onSettled: () => {
      // On success the task moved on; on 409 (stale version) the reviewer needs the fresh one.
      if (taskId) {
        queryClient.invalidateQueries({ queryKey: reviewTaskQueryKey(taskId) })
      }
    },
  })

  const clearIntegrityMutation = useMutation({
    mutationFn: ({ taskId: targetTaskId, payload }) =>
      reviewsApi.clearIntegrityFlags(targetTaskId || taskId, payload),
    onSuccess: seedTask,
    onError: () => {
      if (taskId) {
        queryClient.invalidateQueries({ queryKey: reviewTaskQueryKey(taskId) })
      }
    },
  })

  return {
    ...taskQuery,
    task: taskQuery.data,
    openTaskAsync: openTaskMutation.mutateAsync,
    isOpeningTask: openTaskMutation.isPending,
    openTaskError: openTaskMutation.error,
    adjudicateAsync: adjudicateMutation.mutateAsync,
    isAdjudicating: adjudicateMutation.isPending,
    adjudicateError: adjudicateMutation.error,
    clearIntegrityAsync: clearIntegrityMutation.mutateAsync,
    isClearingIntegrity: clearIntegrityMutation.isPending,
    clearIntegrityError: clearIntegrityMutation.error,
  }
}
