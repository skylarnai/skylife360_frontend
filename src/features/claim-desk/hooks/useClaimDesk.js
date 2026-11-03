import { create } from 'zustand'
import { useQuery } from '@tanstack/react-query'
import { claimsApi } from '@/features/claims/api/claimsApi'
import { deskStatus } from '../utils/deskStatus'

export const useDeskStore = create((set) => ({
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
  resetDesk: () =>
    set({
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

export function useClaimDesk(claimId = 'SUV-261028-01') {
  const desk = useDeskStore()
  const claimQuery = useQuery({
    queryKey: ['claim', claimId],
    queryFn: () => claimsApi.getClaimById(claimId),
  })

  // Derive gapsLeft from real gaps count if available, otherwise default to 0
  const gapsLeft = typeof desk.gapsCount === 'number' ? desk.gapsCount : 0

  const statusInfo = deskStatus({
    uploaded: desk.uploaded,
    retried: desk.retried,
    gapsRun: desk.gapsRun,
    integrityRun: desk.integrityRun,
    decision: desk.decision,
    submitted: desk.submitted,
    tpaName: claimQuery.data?.tpa_name || 'TPA SYN-3',
  })

  return {
    claim: claimQuery.data,
    isLoadingClaim: claimQuery.isLoading,
    desk,
    updateDesk: desk.updateDesk,
    resetDesk: desk.resetDesk,
    gapsLeft,
    statusInfo,
  }
}
