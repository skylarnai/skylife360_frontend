import { useMutation } from '@tanstack/react-query'
import { useRefreshClaim } from '@/features/claims/hooks/useClaimDocuments'
import { ingestionApi } from '../api/ingestionApi'

/**
 * Retry failed storage or failed text reading for files of a claim.
 * Each file belongs to one upload batch, so the call is made per batch: mutate({ batchId, fileIds }).
 */
export function useRetryFiles(claimId) {
  const refreshClaim = useRefreshClaim()

  return useMutation({
    mutationFn: ({ batchId, fileIds }) => ingestionApi.retryBatch(batchId, fileIds),
    onSuccess: () => refreshClaim(claimId),
  })
}
