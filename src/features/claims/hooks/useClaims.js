import { useQuery } from '@tanstack/react-query'
import { claimsApi } from '../api/claimsApi'

export function useClaims(filters = {}) {
  return useQuery({
    queryKey: ['claims', filters],
    queryFn: () => claimsApi.getClaims(filters),
  })
}

export function usePendingReviewsCount() {
  return useQuery({
    queryKey: ['reviews', 'pending', 'count'],
    queryFn: () => claimsApi.getPendingReviews({ limit: 1, offset: 0 }),
  })
}
