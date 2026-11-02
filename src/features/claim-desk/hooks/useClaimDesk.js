import { create } from 'zustand'
import { useQuery } from '@tanstack/react-query'
import { claimsApi } from '@/features/claims/api/claimsApi'
import { PROTOTYPE_GAPS } from '../constants'
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
  packetId: 'pa-41d0',
  gapRunId: 'run-3c1e',
  integrityRunId: 'int-9a2b',
  reviewTaskId: 'tsk-7f10',

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
    }),
}))

export function useClaimDesk(claimId = 'SUV-261028-01') {
  const desk = useDeskStore()
  const claimQuery = useQuery({
    queryKey: ['claim', claimId],
    queryFn: () => claimsApi.getClaimById(claimId),
  })

  const gapsLeft = PROTOTYPE_GAPS.filter((g) => g[1] === 'amb').length
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
