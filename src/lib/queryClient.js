import { QueryClient } from '@tanstack/react-query'
import { onUserChange } from './sessionReset'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) => {
        if (
          error?.status === 401 ||
          error?.status === 403 ||
          error?.status === 404 ||
          error?.status === 409
        ) {
          return false
        }
        return failureCount < 1
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
})

// Cached patient and claim data belongs to the user who fetched it.
onUserChange(() => queryClient.clear())
