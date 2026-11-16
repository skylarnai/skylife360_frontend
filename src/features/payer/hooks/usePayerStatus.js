import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { submissionQueryKey } from '@/features/review/hooks/useSubmission'
import { payerApi } from '../api/payerApi'

const POLL_INTERVAL_MS = 5000

export const payerStatusQueryKey = (submissionId) => ['payer-status', submissionId]

const notAcknowledged = (error) => error?.code === 'PAYER_STATUS_NOT_FOUND'

/**
 * The claim at the payer for a SUBMITTED submission. Polls until the payer's status is final
 * (or, before the payer acknowledges it, until it does). Actions answer the new status.
 */
export function usePayerStatus(submissionId, { enabled = true } = {}) {
  const queryClient = useQueryClient()
  const key = payerStatusQueryKey(submissionId)

  const statusQuery = useQuery({
    queryKey: key,
    queryFn: () => payerApi.getPayerStatus(submissionId),
    enabled: Boolean(submissionId) && enabled,
    retry: (count, error) => !notAcknowledged(error) && count < 2,
    refetchInterval: (query) => {
      if (query.state.error) return notAcknowledged(query.state.error) ? POLL_INTERVAL_MS : false
      return query.state.data && !query.state.data.is_final ? POLL_INTERVAL_MS : false
    },
  })

  const onUpdated = (data) => {
    queryClient.setQueryData(key, data)
    queryClient.invalidateQueries({ queryKey: submissionQueryKey(submissionId) })
    queryClient.invalidateQueries({ queryKey: ['claims'] })
  }

  const refresh = useMutation({
    mutationFn: () => payerApi.refreshPayerStatus(submissionId),
    onSuccess: onUpdated,
  })
  const respond = useMutation({
    mutationFn: (body) => payerApi.respondToQuery(submissionId, body),
    onSuccess: onUpdated,
  })
  const appeal = useMutation({
    mutationFn: (body) => payerApi.appeal(submissionId, body),
    onSuccess: onUpdated,
  })
  const withdraw = useMutation({
    mutationFn: (reason) => payerApi.withdraw(submissionId, reason),
    onSuccess: onUpdated,
  })

  return {
    payerStatus: statusQuery.data || null,
    isLoading: statusQuery.isLoading,
    awaitingAcknowledgement: notAcknowledged(statusQuery.error),
    error: notAcknowledged(statusQuery.error) ? null : statusQuery.error,
    refresh,
    respond,
    appeal,
    withdraw,
  }
}

/** Mock insurer scenarios for the admin dropdown; empty when the mock payer is off (404). */
export function useMockScenarios({ enabled = true } = {}) {
  return useQuery({
    queryKey: ['mock-payer', 'scenarios'],
    queryFn: payerApi.getScenarios,
    enabled,
    retry: false,
    staleTime: Infinity,
    select: (data) => data?.scenarios || [],
  })
}

export function usePrecheck() {
  return useMutation({ mutationFn: (body) => payerApi.precheck(body) })
}
