import { useQuery } from '@tanstack/react-query'
import { claimsApi } from '../api/claimsApi'

export function useClaims(filters = {}) {
  return useQuery({
    queryKey: ['claims', filters],
    queryFn: () => claimsApi.getClaims(filters),
    placeholderData: (previous) => previous, // keep the table while filters change
  })
}
