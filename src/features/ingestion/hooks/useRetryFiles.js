import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ingestionApi } from '../api/ingestionApi'
import { batchQueryKey } from './useBatch'

/**
 * Retry failed storage or failed text extraction for chosen files in a batch.
 * On success, updates the React Query cache for the batch and triggers a refetch.
 */
export function useRetryFiles(batchId) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (fileIds) => ingestionApi.retryBatch(batchId, fileIds),
    onSuccess: (data) => {
      if (batchId && data?.files) {
        queryClient.setQueryData(batchQueryKey(batchId), (oldBatch) => {
          if (!oldBatch) return oldBatch
          return {
            ...oldBatch,
            ...data,
            files: data.files,
          }
        })
      }
      if (batchId) {
        queryClient.invalidateQueries({ queryKey: batchQueryKey(batchId) })
      }
    },
  })
}

