import { useQuery } from '@tanstack/react-query'
import { integrityApi } from '../api/integrityApi'

const POLL_INTERVAL_MS = 3000

function isIntegrityRunBusy(run) {
  if (!run) return false
  const status = run.status?.toUpperCase()
  return status === 'QUEUED' || status === 'PROCESSING'
}

export const integrityRunQueryKey = (runId) => ['integrity-run', runId]

/**
 * Loads an integrity check run by run_id.
 * Automatically polls every 3 seconds while status is QUEUED or PROCESSING.
 */
export function useIntegrityRun(runId) {
  return useQuery({
    queryKey: integrityRunQueryKey(runId),
    queryFn: () => integrityApi.getRun(runId),
    enabled: Boolean(runId),
    refetchInterval: (query) => (isIntegrityRunBusy(query.state.data) ? POLL_INTERVAL_MS : false),
  })
}

