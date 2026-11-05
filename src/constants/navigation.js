import { env } from '@/config/env'
import { ROUTES } from './routes'
import { isAdminRole } from './permissions'

// Doctor / Staff flow (S05–S08). NEEDED endpoints fall back to prototype mock data until the backend ships them.
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
    key: 'users',
    label: 'Users & access',
    to: ROUTES.USERS,
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
  ...(env.enableAsk
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

export function getTabsForRole(role) {
  if (!DOCTOR_PANEL_ENABLED) {
    return ADMIN_TABS
  }
  return isAdminRole(role) ? ADMIN_TABS : CLINICAL_TABS
}
