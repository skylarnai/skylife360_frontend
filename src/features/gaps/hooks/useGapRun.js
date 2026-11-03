import { useQuery } from '@tanstack/react-query'
import { gapsApi } from '../api/gapsApi'

const POLL_INTERVAL_MS = 2000

function isGapRunBusy(run) {
  if (!run) return false
  const status = run.status?.toUpperCase()
  return status === 'PENDING' || status === 'EVALUATING' || status === 'REPORT_GENERATING'
}

export const gapRunQueryKey = (runId) => ['gaps-run', runId]

/**
 * Loads gap findings and results for a run, polling while still evaluating.
 */
export function useGapRun(runId) {
  return useQuery({
    queryKey: gapRunQueryKey(runId),
    queryFn: () => gapsApi.getRun(runId),
    enabled: Boolean(runId),
    refetchInterval: (query) => (isGapRunBusy(query.state.data) ? POLL_INTERVAL_MS : false),
  })
}

