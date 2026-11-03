import { useQuery } from '@tanstack/react-query'
import { isExtractionInProgress } from '@/constants/statusMaps'
import { ingestionApi } from '../api/ingestionApi'

const POLL_INTERVAL_MS = 3000

export const batchQueryKey = (batchId) => ['ingestion-batch', batchId]

/** True while the backend is still storing or reading any file in the batch. */
export function isBatchBusy(batch) {
  if (!batch) return false
  if (batch.is_complete === false) return true
  return (batch.files || []).some(
    (file) => file.extraction && isExtractionInProgress(file.extraction.status)
  )
}

/** Load one upload batch; polls every 3 s while anything is still in progress. */
export function useBatch(batchId) {
  return useQuery({
    queryKey: batchQueryKey(batchId),
    queryFn: () => ingestionApi.getBatch(batchId),
    enabled: Boolean(batchId),
    refetchInterval: (query) => (isBatchBusy(query.state.data) ? POLL_INTERVAL_MS : false),
  })
}
