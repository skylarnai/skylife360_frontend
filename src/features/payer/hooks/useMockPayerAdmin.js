import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { payerApi } from '../api/payerApi'

const PAYERS_KEY = ['mock-payer', 'payers']

export function useMockPayers() {
  return useQuery({
    queryKey: PAYERS_KEY,
    queryFn: payerApi.listMockPayers,
    retry: false,
    select: (data) => data?.payers || [],
  })
}

export function useUpsertMockPayer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body) => payerApi.upsertMockPayer(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PAYERS_KEY }),
  })
}

export function useCreateMockPolicy() {
  return useMutation({ mutationFn: (body) => payerApi.createMockPolicy(body) })
}

export function useLookupMockPolicy() {
  return useMutation({ mutationFn: (policyNumber) => payerApi.getMockPolicy(policyNumber) })
}

export function useConnectEndpoint() {
  return useMutation({ mutationFn: (body) => payerApi.connectEndpoint(body) })
}

export function useRunMockWorker() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: payerApi.runWorker,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payer-status'] })
      queryClient.invalidateQueries({ queryKey: ['claims'] })
    },
  })
}
