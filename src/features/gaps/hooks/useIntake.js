import { useQuery } from '@tanstack/react-query'
import { intakeApi } from '../api/intakeApi'

export const intakeQueryKey = (intakeId) => ['claim-intake', intakeId]

/**
 * Loads an intake record to recover gapRunId, packetId, and pipeline across page reloads.
 */
export function useIntake(intakeId) {
  return useQuery({
    queryKey: intakeQueryKey(intakeId),
    queryFn: () => intakeApi.getIntake(intakeId),
    enabled: Boolean(intakeId),
  })
}

