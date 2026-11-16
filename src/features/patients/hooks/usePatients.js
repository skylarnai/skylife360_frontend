import { useQuery } from '@tanstack/react-query'
import { patientsApi } from '../api/patientsApi'

export function usePatients() {
  return useQuery({
    queryKey: ['patients', 'list'],
    queryFn: () => patientsApi.listPatients(),
    staleTime: 5 * 60_000,
    select: (data) => ({ patients: data?.items || [], total: data?.total ?? 0 }),
  })
}

export function usePatient(userId) {
  return useQuery({
    queryKey: ['patients', userId],
    queryFn: () => patientsApi.getPatient(userId),
    enabled: Boolean(userId),
    // 403 (out of scope) and 404 (unknown) are answers, not glitches: don't retry them.
    retry: (count, error) => ![403, 404].includes(error?.status) && count < 2,
    select: (data) => ({ patient: data }),
  })
}
