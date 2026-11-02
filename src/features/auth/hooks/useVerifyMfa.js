import { useMutation } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router-dom'
import { isAdminRole } from '@/constants/permissions'
import { getLandingRoute } from '@/constants/routes'
import { authApi } from '@/services/auth/authApi'
import { useSessionStore } from '@/store/sessionStore'
import { useUiStore } from '@/store/uiStore'

export function useVerifyMfa() {
  const navigate = useNavigate()
  const location = useLocation()
  const setSession = useSessionStore((state) => state.setSession)
  const returnToPath = useSessionStore((state) => state.returnToPath)
  const setReturnToPath = useSessionStore((state) => state.setReturnToPath)
  const logActivity = useUiStore((state) => state.logActivity)

  return useMutation({
    mutationFn: ({ mfa_token, code }) => authApi.verifyMfa({ mfa_token, code }),
    onSuccess: async (result) => {
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
