import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { submissionsApi } from '../api/submissionsApi'

const POLL_INTERVAL_MS = 3000

// Backend statuses (f006 submission/status.py): QUEUED -> DISPATCHING -> SUBMITTED,
// with RETRY_SCHEDULED between attempts. PAYER_REJECTED and DEAD_LETTERED are final.
export const SUBMISSION_BUSY_STATUSES = ['QUEUED', 'DISPATCHING', 'RETRY_SCHEDULED']

function isSubmissionBusy(submission) {
  if (!submission) return false
  return SUBMISSION_BUSY_STATUSES.includes(String(submission.status || '').toUpperCase())
}

export const submissionQueryKey = (submissionId) => ['claim-submission', submissionId]

/**
 * Loads and polls a Claim Submission until it reaches a final state
 * (SUBMITTED, PAYER_REJECTED or DEAD_LETTERED).
 * Also provides mutations for creating a submission and requeueing a dead-lettered one.
 */
export function useSubmission(submissionId) {
  const queryClient = useQueryClient()

  const submissionQuery = useQuery({
    queryKey: submissionQueryKey(submissionId),
    queryFn: () => submissionsApi.getSubmission(submissionId),
    enabled: Boolean(submissionId),
    refetchInterval: (query) => (isSubmissionBusy(query.state.data) ? POLL_INTERVAL_MS : false),
  })

  const submitMutation = useMutation({
    mutationFn: (packetId) => submissionsApi.createSubmission(packetId),
    onSuccess: (data) => {
      if (data?.submission_id) {
        queryClient.invalidateQueries({ queryKey: submissionQueryKey(data.submission_id) })
      }
    },
  })

  const requeueMutation = useMutation({
    mutationFn: ({ submissionId: subId, reason }) => submissionsApi.requeue(subId || submissionId, reason),
    onSuccess: () => {
      if (submissionId) {
        queryClient.invalidateQueries({ queryKey: submissionQueryKey(submissionId) })
      }
    },
  })

  return {
    ...submissionQuery,
    submission: submissionQuery.data,
    createSubmission: submitMutation.mutate,
    createSubmissionAsync: submitMutation.mutateAsync,
    isSubmitting: submitMutation.isPending,
    submitError: submitMutation.error,
    requeue: requeueMutation.mutate,
    isRequeueing: requeueMutation.isPending,
    requeueError: requeueMutation.error,
  }
}
