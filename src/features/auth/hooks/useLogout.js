import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { queryClient } from '@/lib/queryClient'
import { authApi } from '@/services/auth/authApi'
import { useSessionStore } from '@/store/sessionStore'
import { useUiStore } from '@/store/uiStore'

export function useLogout() {
  const navigate = useNavigate()
  const clearSession = useSessionStore((state) => state.clearSession)
  const logActivity = useUiStore((state) => state.logActivity)

  return useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: () => {
      logActivity('signed out')
      queryClient.clear()
      clearSession(null)
      navigate(ROUTES.LOGIN, { replace: true })
    },
  })
}
