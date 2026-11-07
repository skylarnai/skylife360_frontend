import { useCallback } from 'react'
import { isAdminRole } from '@/constants/permissions'
import { authApi } from '@/services/auth/authApi'
import { useSessionStore } from '@/store/sessionStore'
import { useUiStore } from '@/store/uiStore'
import { queryClient } from '@/lib/queryClient'

export function useSession() {
  const user = useSessionStore((state) => state.user)
  const role = useSessionStore((state) => state.role)
  const backendRole = useSessionStore((state) => state.backendRole)
  const permissions = useSessionStore((state) => state.permissions)
  const hospital = useSessionStore((state) => state.hospital)
  const csrfToken = useSessionStore((state) => state.csrfToken)
  const todoCount = useSessionStore((state) => state.todoCount)
  const isHydrated = useSessionStore((state) => state.isHydrated)
  const returnToPath = useSessionStore((state) => state.returnToPath)
  const setSession = useSessionStore((state) => state.setSession)
  const clearSession = useSessionStore((state) => state.clearSession)
  const setTodoCount = useSessionStore((state) => state.setTodoCount)
  const logActivity = useUiStore((state) => state.logActivity)

  const logout = useCallback(async () => {
    logActivity('signed out')
    try {
      await authApi.logout()
    } finally {
      queryClient.clear()
      clearSession(null)
    }
  }, [clearSession, logActivity])

  const isAdmin = isAdminRole(role)

  return {
    user,
    role,
    permissions,
    hospital,
    csrfToken,
    todoCount,
    isHydrated,
    returnToPath,
    isAuthenticated: Boolean(user),
    isAdmin,
    isDoctorOrStaff: Boolean(user) && !isAdmin,
    // Doctors (VIEWER) see only the patients granted to them; staff and admins see the whole hospital.
    isScopedToGrants: backendRole === 'VIEWER',
    backendRole,
    setSession,
    clearSession,
    setTodoCount,
    logout,
  }
}
