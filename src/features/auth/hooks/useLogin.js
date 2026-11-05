import { useMutation } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router-dom'
import { MESSAGES } from '@/constants/messages'
import { ApiError } from '@/services/api/apiError'
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
  if (error.code === 'ROLE_MISMATCH') {
    return error.message
  }
  if (error.status === 0 || error.code === 'NETWORK_ERROR') {
    return MESSAGES.NETWORK_ERROR
  }
  return error.message || MESSAGES.GENERIC_ERROR
}

const ROLE_LABEL = { admin: 'Admin', doctor: 'Doctor / Staff' }

function roleMismatch(email, actual) {
  const label = ROLE_LABEL[actual]
  return new ApiError({
    status: 403,
    code: 'ROLE_MISMATCH',
    message: `${email} is ${actual === 'admin' ? 'an' : 'a'} ${label} account. Pick “${label}” above, or use a matching account.`,
  })
}

// Admin-only screens a Doctor / Staff user must never be sent to after sign-in
const ADMIN_ONLY_PREFIXES = ['/claims', '/users']

export function useLogin() {
  const navigate = useNavigate()
  const location = useLocation()
  const setSession = useSessionStore((state) => state.setSession)
  const setMfaChallenge = useSessionStore((state) => state.setMfaChallenge)
  const returnToPath = useSessionStore((state) => state.returnToPath)
  const setReturnToPath = useSessionStore((state) => state.setReturnToPath)
  const logActivity = useUiStore((state) => state.logActivity)

  return useMutation({
    mutationFn: async ({ expectedRole, ...credentials }) => {
      const result = await authApi.login(credentials)
      if (!expectedRole) return result

      // MFA is only required for admin accounts.
      if (result?.mfa_required) {
        if (expectedRole !== 'admin') throw roleMismatch(credentials.email, 'admin')
        return result
      }

      const sessionData = result?.user ? result : await authApi.me()
      const actual = isAdminRole(sessionData.role) ? 'admin' : 'doctor'
      if (actual !== expectedRole) {
        // Undo the session the server just created, then explain.
        await authApi.logout(sessionData.csrf_token).catch(() => {})
        throw roleMismatch(credentials.email, actual)
      }
      return sessionData
    },
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
        sessionData.user?.name,
      )

      const landing = getLandingRoute(sessionData.role)
      let destination = location.state?.from || returnToPath || landing
      if (
        !isAdminRole(sessionData.role) &&
        ADMIN_ONLY_PREFIXES.some((prefix) => destination.startsWith(prefix))
      ) {
        destination = landing
      }
      setReturnToPath(null)
      navigate(destination, { replace: true })
    },
  })
}
