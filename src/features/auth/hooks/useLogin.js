import { useMutation } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router-dom'
import { MESSAGES } from '@/constants/messages'
import { isAdminRole } from '@/constants/permissions'
import { getLandingRoute, ROUTES } from '@/constants/routes'
import { authApi } from '@/services/auth/authApi'
import { useSessionStore } from '@/store/sessionStore'
import { useUiStore } from '@/store/uiStore'

export function mapAuthErrorMessage(error) {
  if (!error) return ''
  if (error.status === 423 || error.code === 'ACCOUNT_LOCKED') {
    return 'Too many attempts. Try again in 15 minutes or reset your password.'
  }
  if (error.status === 429 || error.code === 'RATE_LIMITED') {
    return 'Too many attempts. Wait a minute and try again.'
  }
  if (error.code === 'INVALID_MFA') {
    return 'That code is incorrect or has expired. Check your authenticator app and try again.'
  }
  if (error.status === 401 || error.code === 'INVALID_CREDENTIALS') {
    return 'Email or password is incorrect.'
  }
  if (error.status === 0 || error.code === 'NETWORK_ERROR') {
    return MESSAGES.NETWORK_ERROR
  }
  return error.message || MESSAGES.GENERIC_ERROR
}

export function useLogin() {
  const navigate = useNavigate()
  const location = useLocation()
  const setSession = useSessionStore((state) => state.setSession)
  const setMfaChallenge = useSessionStore((state) => state.setMfaChallenge)
  const returnToPath = useSessionStore((state) => state.returnToPath)
  const setReturnToPath = useSessionStore((state) => state.setReturnToPath)
  const logActivity = useUiStore((state) => state.logActivity)

  return useMutation({
    mutationFn: (credentials) => authApi.login(credentials),
    onSuccess: async (result, variables) => {
      if (result?.mfa_required && result?.mfa_token) {
        setMfaChallenge({
          mfaToken: result.mfa_token,
          email: variables?.email || result.email,
          devOtp: result.dev_otp,
        })
        navigate(ROUTES.LOGIN_MFA, {
          replace: true,
          state: { from: location.state?.from || returnToPath },
        })
        return
      }

      const sessionData = result?.user ? result : await authApi.me()
      setSession(sessionData)
      logActivity(
        `signed in as ${isAdminRole(sessionData.role) ? 'Admin' : 'Doctor / Staff'}`,
        sessionData.user?.name
      )

      const destination =
        location.state?.from || returnToPath || getLandingRoute(sessionData.role)
      setReturnToPath(null)
      navigate(destination, { replace: true })
    },
  })
}
