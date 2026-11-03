import { useEffect } from 'react'
import { create } from 'zustand'
import { useQuery } from '@tanstack/react-query'
import { claimsApi } from '@/features/claims/api/claimsApi'
import { claimQueryKey } from '@/features/claims/hooks/useClaimDocuments'
import { deskStatus } from '../utils/deskStatus'

export const useDeskStore = create((set) => ({
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
  reviewTaskId: 'tsk-7f10',
  gapsCount: null, // real soft + hard gaps count from latest run

  updateDesk: (partial) => set((state) => ({ ...state, ...partial })),
  resetDesk: (claimId = null) =>
    set({
      claimId,
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
      gapsCount: null,
    }),
}))

export function useClaimDesk(claimId) {
  const desk = useDeskStore()
  const claimQuery = useQuery({
    queryKey: claimQueryKey(claimId),
    queryFn: () => claimsApi.getClaimById(claimId),
    enabled: Boolean(claimId),
    retry: (count, error) => ![403, 404].includes(error?.status) && count < 2,
  })

  // The desk store is global: start clean whenever another claim is opened.
  const { resetDesk } = desk
  useEffect(() => {
    if (claimId && desk.claimId !== claimId) resetDesk(claimId)
  }, [claimId, desk.claimId, resetDesk])

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
    desk: { ...desk, uploaded },
    updateDesk: desk.updateDesk,
    resetDesk: desk.resetDesk,
    gapsLeft,
    statusInfo,
  }
}
