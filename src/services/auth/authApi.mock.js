import { env } from '@/config/env'
import { DOCTOR_PANEL_ENABLED } from '@/constants/navigation'
import { ROLE_PERMISSIONS, ROLES } from '@/constants/permissions'
import { ApiError } from '@/services/api/apiError'

const MOCK_ROLE_KEY = 'skyclaims.mock_role'
const LOGGED_OUT_KEY = 'skyclaims.logged_out'

export const DEMO_USERS = {
  admin: {
    key: 'admin',
    password: 'demo1234',
    mfaRequired: true,
    mfaCode: '123456',
    user: {
      id: 'usr-admin-01',
      name: 'A. Rao',
      email: 'a.rao@suvidha.demo',
      title: 'Claims admin',
    },
    role: ROLES.ADMIN,
    permissions: ROLE_PERMISSIONS[ROLES.ADMIN],
    hospital: {
      name: 'Suvidha Hospital',
      city: 'Hyderabad',
      tenant_id: 'SYN-HOSP-01',
    },
    csrf_token: 'csrf-syn-admin-01',
    todoCount: 0,
  },
  doctor: {
    key: 'doctor',
    password: 'demo1234',
    mfaRequired: false,
    user: {
      id: 'usr-doc-01',
      name: 'Dr. S. Menon',
      email: 's.menon@suvidha.demo',
      title: 'Consultant, General Surgery',
    },
    role: ROLES.DOCTOR,
    permissions: ROLE_PERMISSIONS[ROLES.DOCTOR],
    hospital: {
      name: 'Suvidha Hospital',
      city: 'Hyderabad',
      tenant_id: 'SYN-HOSP-01',
    },
    csrf_token: 'csrf-syn-doctor-01',
    todoCount: 5,
  },
  records_staff: {
    key: 'records_staff',
    password: 'demo1234',
    mfaRequired: false,
    user: {
      id: 'usr-staff-01',
      name: 'K. Iyer',
      email: 'k.iyer@suvidha.demo',
      title: 'Medical records staff',
    },
    role: ROLES.RECORDS_STAFF,
    permissions: ROLE_PERMISSIONS[ROLES.RECORDS_STAFF],
    hospital: {
      name: 'Suvidha Hospital',
      city: 'Hyderabad',
      tenant_id: 'SYN-HOSP-01',
    },
    csrf_token: 'csrf-syn-staff-01',
    todoCount: 5,
  },
}

const pendingMfaTokens = new Map()

export function getActiveMockRoleKey() {
  if (!DOCTOR_PANEL_ENABLED) {
    return 'admin'
  }
  try {
    const stored = window.sessionStorage.getItem(MOCK_ROLE_KEY)
    if (stored && DEMO_USERS[stored]) {
      return stored
    }
  } catch {
    // Ignore storage errors
  }
  const fromEnv = env.mockRole
  if (fromEnv === 'doctor' || fromEnv === 'records_staff' || fromEnv === 'admin') {
    return fromEnv
  }
  return 'admin'
}

export function setActiveMockRoleKey(roleKey) {
  if (!DOCTOR_PANEL_ENABLED) {
    try {
      window.sessionStorage.setItem(MOCK_ROLE_KEY, 'admin')
      window.sessionStorage.removeItem(LOGGED_OUT_KEY)
    } catch {
      // Ignore storage errors
    }
    return DEMO_USERS.admin
  }

  const normalized = String(roleKey || 'admin').toLowerCase()
  const key = DEMO_USERS[normalized] ? normalized : 'admin'
  try {
    window.sessionStorage.setItem(MOCK_ROLE_KEY, key)
    window.sessionStorage.removeItem(LOGGED_OUT_KEY)
  } catch {
    // Ignore storage errors
  }
  return DEMO_USERS[key]
}

export const authApiMock = {
  async me() {
    try {
      if (window.sessionStorage.getItem(LOGGED_OUT_KEY) === '1') {
        throw new ApiError({
          status: 401,
          code: 'UNAUTHORIZED',
          message: 'Session expired. Please sign in again.',
        })
      }
    } catch (err) {
      if (err instanceof ApiError) throw err
    }

    const key = getActiveMockRoleKey()
    return DEMO_USERS[key] || DEMO_USERS.admin
  },

  async login({ email, password, roleKey, skipMfa = false } = {}) {
    if (roleKey && DEMO_USERS[roleKey]) {
      return setActiveMockRoleKey(roleKey)
    }

    const normalizedEmail = String(email || '').trim().toLowerCase()
    const matchedEntry = Object.entries(DEMO_USERS).find(
      ([, profile]) => profile.user.email.toLowerCase() === normalizedEmail
    )

    if (!matchedEntry || password !== matchedEntry[1].password) {
      throw new ApiError({
        status: 401,
        code: 'INVALID_CREDENTIALS',
        message: 'Email or password is incorrect.',
      })
    }

    const [key, profile] = matchedEntry

    if (!DOCTOR_PANEL_ENABLED && key !== 'admin') {
      throw new ApiError({
        status: 403,
        code: 'DOCTOR_PANEL_DISABLED',
        message:
          'Doctor / Staff panel is currently disabled while we complete the Admin workflow APIs.',
      })
    }

    if (profile.mfaRequired && !skipMfa) {
      const mfaToken = `mfa-syn-${Date.now()}`
      pendingMfaTokens.set(mfaToken, key)
      return {
        mfa_required: true,
        mfa_token: mfaToken,
        email: profile.user.email,
      }
    }

    return setActiveMockRoleKey(key)
  },

  async verifyMfa({ mfa_token, code }) {
    const cleanCode = String(code || '').trim()
    if (cleanCode !== '123456') {
      throw new ApiError({
        status: 401,
        code: 'INVALID_MFA_CODE',
        message: 'Invalid verification code. Enter the 6-digit code from your authenticator app.',
      })
    }

    const roleKey = pendingMfaTokens.get(mfa_token) || 'admin'
    pendingMfaTokens.delete(mfa_token)
    return setActiveMockRoleKey(roleKey)
  },

  async logout() {
    try {
      window.sessionStorage.setItem(LOGGED_OUT_KEY, '1')
    } catch {
      // Ignore storage errors
    }
  },

  async forgotPassword({ email }) {
    return {
      accepted: true,
      email,
    }
  },

  async resetPassword() {
    return {
      reset: true,
    }
  },
}
