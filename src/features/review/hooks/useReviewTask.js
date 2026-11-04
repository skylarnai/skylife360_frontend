import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { reviewsApi } from '../api/reviewsApi'

export const reviewTaskQueryKey = (taskId) => ['review-task', taskId]

/**
 * Loads a Review Task by ID.
 * If taskId is not yet available but packetId is, provides openTask mutation.
 */
export function useReviewTask(taskId) {
  const queryClient = useQueryClient()

  const taskQuery = useQuery({
    queryKey: reviewTaskQueryKey(taskId),
    queryFn: () => reviewsApi.getTask(taskId),
    enabled: Boolean(taskId),
  })

  const openTaskMutation = useMutation({
    mutationFn: (packetId) => reviewsApi.openReviewTask(packetId),
    onSuccess: (data) => {
      if (data?.task_id) {
        queryClient.invalidateQueries({ queryKey: reviewTaskQueryKey(data.task_id) })
      }
    },
  })

  const adjudicateMutation = useMutation({
    mutationFn: ({ taskId: targetTaskId, payload }) =>
      reviewsApi.adjudicate(targetTaskId || taskId, payload),
    onSuccess: () => {
      if (taskId) {
        queryClient.invalidateQueries({ queryKey: reviewTaskQueryKey(taskId) })
      }
    },
  })

  return {
    ...taskQuery,
    task: taskQuery.data,
    openTask: openTaskMutation.mutate,
    openTaskAsync: openTaskMutation.mutateAsync,
    isOpeningTask: openTaskMutation.isPending,
    adjudicate: adjudicateMutation.mutate,
    adjudicateAsync: adjudicateMutation.mutateAsync,
    isAdjudicating: adjudicateMutation.isPending,
    adjudicateError: adjudicateMutation.error,
  }
}

