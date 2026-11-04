import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { submissionsApi } from '../api/submissionsApi'

const POLL_INTERVAL_MS = 3000

function isSubmissionBusy(submission) {
  if (!submission) return false
  const status = submission.status?.toUpperCase()
  return status === 'QUEUED' || status === 'DISPATCHING'
}

export const submissionQueryKey = (submissionId) => ['claim-submission', submissionId]

/**
 * Loads and polls a Claim Submission until final state (SUBMITTED or FAILED).
 * Also provides mutations for creating a submission and requeueing.
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
    mutationFn: (subId) => submissionsApi.requeue(subId || submissionId),
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
  }
}

