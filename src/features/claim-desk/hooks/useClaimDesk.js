import { useCallback, useEffect } from 'react'
import { create } from 'zustand'
import { useQuery } from '@tanstack/react-query'
import { claimsApi } from '@/features/claims/api/claimsApi'
import { claimQueryKey } from '@/features/claims/hooks/useClaimDocuments'
import { onUserChange } from '@/lib/sessionReset'
import { deskStatus } from '../utils/deskStatus'

const INITIAL_DESK = {
  claimId: null, // which claim this desk state belongs to
  uploaded: false,
  retried: false,
  q: 0,
  asked: false,
  gapsRun: false,
  integrityRun: false,
  decision: null,
  pick: null,
  note: '',
  err: '',
  submitted: false,
  batchId: null,
  intakeId: null,
  packetId: null,
  gapRunId: null,
  integrityRunId: null,
  reviewTaskId: null, // from POST /reviews or the intake pipeline view
  submissionId: null, // from the decision's hand-off or POST /claims/submissions
  gapsCount: null, // real soft + hard gaps count from latest run
}

export const useDeskStore = create((set) => ({
  ...INITIAL_DESK,
  updateDesk: (partial) => set((state) => ({ ...state, ...partial })),
  resetDesk: (claimId = null) => set({ ...INITIAL_DESK, claimId }),
}))

// Desk state (intake, packet, task IDs, the decision) belongs to the user who worked the claim.
onUserChange(() => useDeskStore.getState().resetDesk(null))

export function useClaimDesk(claimId) {
  const store = useDeskStore()
  // The store is global. Until it belongs to this claim, read a clean desk, so the first render after
  // switching claims never uses the previous claim's intake / packet / task / decision.
  const desk = store.claimId === claimId ? store : { ...store, ...INITIAL_DESK, claimId }
  const claimQuery = useQuery({
    queryKey: claimQueryKey(claimId),
    queryFn: () => claimsApi.getClaimById(claimId),
    enabled: Boolean(claimId),
    retry: (count, error) => ![403, 404].includes(error?.status) && count < 2,
  })

  // Start clean whenever another claim is opened.
  const { resetDesk } = store
  useEffect(() => {
    if (claimId && store.claimId !== claimId) resetDesk(claimId)
  }, [claimId, store.claimId, resetDesk])

  // Writes always land on this claim's desk, even if they run before the reset effect above.
  const updateDesk = useCallback(
    (partial) =>
      useDeskStore.setState((state) =>
        state.claimId === claimId ? partial : { ...INITIAL_DESK, claimId, ...partial },
      ),
    [claimId],
  )

  // The claim's latest run (intake, packet, integrity run, review task…) and pipeline stage come with
  // GET /claims/{id} (`latest`, `pipeline_stage`), so any admin in any browser picks up where the claim
  // is. Desk state (this browser's memory) still wins for a run made here.
  // Older backend without `latest`: fall back to the worklist row (search by claim ID).
  const claimLoaded = Boolean(claimQuery.data)
  const hasLatestField = claimLoaded && claimQuery.data.latest !== undefined
  const latestQuery = useQuery({
    queryKey: ['claims', 'latest-packet', claimId],
    queryFn: async () => {
      const data = await claimsApi.getClaims({ q: claimId, limit: 20 })
      const row = (data?.items || []).find((c) => c.claim_id === claimId)
      return { packetId: row?.packet_id || null, pipelineStage: row?.pipeline_stage || null }
    },
    enabled: Boolean(claimId) && claimLoaded && !hasLatestField,
    staleTime: 15_000,
  })
  const latest = claimQuery.data?.latest || null

  // A claim with stored documents counts as uploaded, even after a refresh.
  const uploaded = desk.uploaded || (claimQuery.data?.document_counts?.files ?? 0) > 0

  // Derive gapsLeft from real gaps count if available, otherwise default to 0
  const gapsLeft = typeof desk.gapsCount === 'number' ? desk.gapsCount : 0

  const statusInfo = deskStatus({
    uploaded,
    failedFiles: claimQuery.data?.document_counts?.failed ?? 0,
    gapsRun: desk.gapsRun,
    integrityRun: desk.integrityRun,
    decision: desk.decision,
    submitted: desk.submitted,
    tpaName: claimQuery.data?.tpa_name || undefined,
  })

  return {
    claim: claimQuery.data,
    isLoadingClaim: claimQuery.isLoading,
    claimError: claimQuery.error,
    refetchClaim: claimQuery.refetch,
    latest,
    latestPacketId: latest?.packet_id || latestQuery.data?.packetId || null,
    pipelineStage: claimQuery.data?.pipeline_stage || latestQuery.data?.pipelineStage || null,
    desk: { ...desk, uploaded },
    updateDesk,
    resetDesk,
    gapsLeft,
    statusInfo,
  }
}
