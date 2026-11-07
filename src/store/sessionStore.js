import { create } from 'zustand'
import { normalizeRole, ROLE_PERMISSIONS } from '@/constants/permissions'

export const useSessionStore = create((set) => ({
  user: null,
  role: null,
  // Backend role as sent (SUPER_ADMIN | ADMIN | MEMBER | VIEWER). `role` is the normalized UI role,
  // which maps both MEMBER and VIEWER to DOCTOR; scope differs (VIEWER = granted patients only).
  backendRole: null,
  permissions: [],
  hospital: null,
  csrfToken: null,
  todoCount: 0,
  isHydrated: false,
  returnToPath: null,
  // MFA challenge kept in memory only (never persisted to storage).
  // mfaDevOtp is only sent by the backend in development mode.
  mfaToken: null,
  mfaEmail: null,
  mfaDevOtp: null,

  setSession: (payload) => {
    if (!payload || !payload.user) {
      set({
        user: null,
        role: null,
        backendRole: null,
        permissions: [],
        hospital: null,
        csrfToken: null,
        isHydrated: true,
        mfaToken: null,
        mfaEmail: null,
        mfaDevOtp: null,
      })
      return
    }
    const normalizedRole = normalizeRole(payload.role || payload.user.role)
    const permissions =
      Array.isArray(payload.permissions) && payload.permissions.length > 0
        ? payload.permissions
        : ROLE_PERMISSIONS[normalizedRole] || []

    set({
      user: payload.user,
      role: normalizedRole,
      backendRole: String(payload.role || payload.user.role || '').toUpperCase() || null,
      permissions,
      hospital: payload.hospital || null,
      csrfToken: payload.csrf_token || null,
      todoCount: typeof payload.todoCount === 'number' ? payload.todoCount : 0,
      isHydrated: true,
      mfaToken: null,
      mfaEmail: null,
      mfaDevOtp: null,
    })
  },

  setMfaChallenge: ({ mfaToken, email, devOtp }) =>
    set({
      mfaToken,
      mfaEmail: email || null,
      mfaDevOtp: devOtp || null,
    }),

  clearMfaChallenge: () =>
    set({
      mfaToken: null,
      mfaEmail: null,
      mfaDevOtp: null,
    }),

  clearSession: (returnToPath = null) =>
    set((state) => ({
      user: null,
      role: null,
      backendRole: null,
      permissions: [],
      hospital: null,
      csrfToken: null,
      isHydrated: true,
      mfaToken: null,
      mfaEmail: null,
      mfaDevOtp: null,
      returnToPath: returnToPath ?? state.returnToPath,
    })),

  setReturnToPath: (returnToPath) => set({ returnToPath }),

  setTodoCount: (todoCount) => set({ todoCount }),
}))
