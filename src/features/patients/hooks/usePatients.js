import { useQuery } from '@tanstack/react-query'
import { patientsApi } from '../api/patientsApi'

export function usePatients() {
  return useQuery({
    queryKey: ['patients', 'mine'],
    queryFn: () => patientsApi.listPatients(),
    staleTime: 5 * 60_000,
    select: ({ data, source }) => ({ patients: data?.items || [], source }),
  })
}

export function usePatient(userId) {
  return useQuery({
    queryKey: ['patients', userId],
    queryFn: () => patientsApi.getPatient(userId),
    enabled: Boolean(userId),
    select: ({ data, source }) => ({ patient: data, source }),
  })
}

export function usePatientTimeline(userId) {
  return useQuery({
    queryKey: ['patients', userId, 'timeline'],
    queryFn: () => patientsApi.getTimeline(userId),
    enabled: Boolean(userId),
    select: ({ data, source }) => {
      const events = [...(data?.events || [])].sort((a, b) =>
        String(a.date).localeCompare(String(b.date)),
      )
      return { events, source }
    },
  })
}
