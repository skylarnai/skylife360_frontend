import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { usersApi } from '../api/usersApi'

export function useUsers(params = {}) {
  return useQuery({
    queryKey: ['users', params],
    queryFn: () => usersApi.getUsers(params),
    placeholderData: (previous) => previous,
  })
}

export function useCreateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload) => usersApi.createUser(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, payload }) => usersApi.updateUser(userId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })
}

const grantsKey = (userId) => ['users', userId, 'patients']

export function usePatientGrants(userId) {
  return useQuery({
    queryKey: grantsKey(userId),
    queryFn: () => usersApi.getPatientGrants(userId),
    enabled: Boolean(userId),
    select: (data) => data?.assigned_user_ids || [],
  })
}

export function useGrantPatients(userId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (patientIds) => usersApi.grantPatients(userId, patientIds),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: grantsKey(userId) }),
  })
}

export function useRevokePatient(userId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (patientId) => usersApi.revokePatient(userId, patientId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: grantsKey(userId) }),
  })
}
