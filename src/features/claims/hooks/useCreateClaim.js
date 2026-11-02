import { useMutation, useQueryClient } from '@tanstack/react-query'
import { claimsApi } from '../api/claimsApi'

export function useCreateClaim() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload) => claimsApi.createClaim(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claims'] })
    },
  })
}
