import { env } from '@/config/env'
import { ROUTES } from './routes'
import { canUseClaimDesk, isAdminRole, normalizeRole, PERMISSIONS, ROLES } from './permissions'

// Doctor / Staff flow (S05–S08), all on the real backend.
export const DOCTOR_PANEL_ENABLED = true

export const ADMIN_TABS = [
  {
    key: 'worklist',
    label: 'Claims',
    to: ROUTES.CLAIMS,
    isActive: (pathname) => pathname === ROUTES.CLAIMS,
  },
  {
    key: 'desk',
    label: 'Work on a claim',
    to: ROUTES.CLAIM_DESK_DEFAULT,
    isActive: (pathname) => pathname.startsWith('/claims/'),
  },
  {
    key: 'insurance',
    label: 'Insurance',
    to: ROUTES.INSURANCE,
    // Mock insurer admin: ADMIN only (compliance users get 403 from the backend)
    roles: [ROLES.ADMIN],
    isActive: (pathname) => pathname.startsWith(ROUTES.INSURANCE),
  },
  {
    key: 'users',
    label: 'Users & access',
    to: ROUTES.USERS,
    permission: PERMISSIONS.USERS_MANAGE,
    isActive: (pathname) => pathname.startsWith(ROUTES.USERS),
  },
]

export const CLINICAL_TABS = [
  {
    key: 'files',
    label: 'Patient documents',
    to: ROUTES.DOCUMENTS,
    isActive: (pathname) => pathname.startsWith(ROUTES.DOCUMENTS),
  },
  ...(env.enableClinicalAsk
    ? [
        {
          key: 'ask',
          label: 'Ask about a patient',
          to: ROUTES.ASK,
          isActive: (pathname) => pathname.startsWith(ROUTES.ASK),
        },
      ]
    : []),
  {
    key: 'patients',
    label: 'Patient summary',
    to: ROUTES.PATIENT_DEFAULT,
    isActive: (pathname) => pathname.startsWith('/patients'),
  },
  {
    key: 'tasks',
    label: 'My to-dos',
    to: ROUTES.TODOS,
    showTodoCount: true,
    isActive: (pathname) => pathname.startsWith(ROUTES.TODOS),
  },
]

const CLAIM_DESK_TAB_KEYS = ['worklist', 'desk']

/**
 * Tabs come from the role, plus the permissions from /auth/me:
 * - admins get the admin tabs (Users only with users:manage);
 * - a doctor / staff user with a reviewer permission also gets Claims and Work on a claim.
 */
export function getTabsForRole(role, permissions = []) {
  const allowed = (tab) =>
    (!tab.permission || permissions.includes(tab.permission)) &&
    (!tab.roles || tab.roles.includes(normalizeRole(role)))
  if (!DOCTOR_PANEL_ENABLED || isAdminRole(role)) {
    return ADMIN_TABS.filter(allowed)
  }
  if (canUseClaimDesk(role, permissions)) {
    return [...CLINICAL_TABS, ...ADMIN_TABS.filter((tab) => CLAIM_DESK_TAB_KEYS.includes(tab.key))]
  }
  return CLINICAL_TABS
}
