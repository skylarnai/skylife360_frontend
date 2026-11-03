import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isBatchBusy } from '@/features/ingestion/hooks/useBatch'
import { claimsApi } from '../api/claimsApi'

const POLL_INTERVAL_MS = 3000

export const claimQueryKey = (claimId) => ['claim', claimId]
export const claimDocumentsQueryKey = (claimId) => ['claim-documents', claimId]

/**
 * Every document linked to a claim, across all its uploads.
 * Text is read in the background after upload, so this polls every 3 s until nothing is in progress.
 */
export function useClaimDocuments(claimId) {
  return useQuery({
    queryKey: claimDocumentsQueryKey(claimId),
    queryFn: () => claimsApi.getClaimDocuments(claimId),
    enabled: Boolean(claimId),
    refetchInterval: (query) => (isBatchBusy(query.state.data) ? POLL_INTERVAL_MS : false),
  })
}

/** Refresh a claim's header and document list after files are added, retried or removed. */
export function useRefreshClaim() {
  const queryClient = useQueryClient()
  return (claimId) => {
    queryClient.invalidateQueries({ queryKey: claimDocumentsQueryKey(claimId) })
    queryClient.invalidateQueries({ queryKey: claimQueryKey(claimId) })
    queryClient.invalidateQueries({ queryKey: ['claims'] })
  }
}

/** DELETE /claims/{id}/documents/{file_id}: take one file off the claim. */
export function useDeleteClaimDocument(claimId) {
  const refreshClaim = useRefreshClaim()
  return useMutation({
    mutationFn: (fileId) => claimsApi.deleteClaimDocument(claimId, fileId),
    onSuccess: () => refreshClaim(claimId),
  })
}
