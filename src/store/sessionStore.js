import { create } from 'zustand'
import { normalizeRole, ROLE_PERMISSIONS } from '@/constants/permissions'

export const useSessionStore = create((set) => ({
  user: null,
  role: null,
  permissions: [],
  hospital: null,
  csrfToken: null,
  todoCount: 5,
  isHydrated: false,
  returnToPath: null,
  // MFA token kept in memory only (never persisted to storage)
  mfaToken: null,
  mfaEmail: null,

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
      hospital: payload.hospital || {
        name: 'Suvidha Hospital',
        city: 'Hyderabad',
        tenant_id: payload.user?.tenant_id || 'HOSP-001',
      },
      csrfToken: payload.csrf_token || payload.csrfToken || 'csrf-syn-token',
      todoCount: typeof payload.todoCount === 'number' ? payload.todoCount : 5,
      isHydrated: true,
      mfaToken: null,
      mfaEmail: null,
    })
  },

  setMfaChallenge: ({ mfaToken, email }) =>
    set({
      mfaToken,
      mfaEmail: email || null,
    }),

  clearMfaChallenge: () =>
    set({
      mfaToken: null,
      mfaEmail: null,
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
      returnToPath: returnToPath ?? state.returnToPath,
    })),

  setReturnToPath: (returnToPath) => set({ returnToPath }),

  setTodoCount: (todoCount) => set({ todoCount }),
}))
