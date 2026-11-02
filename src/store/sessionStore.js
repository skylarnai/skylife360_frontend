import { create } from 'zustand'
import { normalizeRole, ROLE_PERMISSIONS } from '@/constants/permissions'

export const useSessionStore = create((set) => ({
  user: null,
  role: null,
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
