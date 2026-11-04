import { useState, useCallback } from 'react'
import { authApi } from '@/services/auth/authApi'
import { env } from '@/config/env'
import { mapAuthErrorMessage } from './useLogin'

export function useGoogleAuth() {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState(null)

  const loginWithGoogle = useCallback(async (tenantId) => {
    setIsPending(true)
    setError(null)

    const targetTenant = tenantId || env.defaultTenantId || 'HOSP-001'

    try {
      // 1. Attempt JSON exchange first to get auth_url cleanly through proxy
      const authUrl = await authApi.getGoogleAuthUrl(targetTenant)
      if (authUrl) {
        window.location.href = authUrl
        return
      }
      // 2. Direct redirect fallback
      authApi.loginWithGoogle(targetTenant)
    } catch (err) {
      // If endpoint returned specific error (e.g. 501 OAuth Not Configured or network issue)
      if (err?.status === 501 || err?.status === 404) {
        setError(err.message || 'Google OAuth is not enabled on the server.')
        setIsPending(false)
        return
      }

      // If AJAX failed due to redirect/CORS, fall back directly to browser navigation
      try {
        authApi.loginWithGoogle(targetTenant)
      } catch (redirectErr) {
        setError(mapAuthErrorMessage(redirectErr) || 'Failed to initiate Google Sign-In.')
        setIsPending(false)
      }
    }
  }, [])

  return {
    loginWithGoogle,
    isPending,
    error,
    clearError: () => setError(null),
  }
}
