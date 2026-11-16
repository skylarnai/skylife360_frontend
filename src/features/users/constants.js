import { PERMISSIONS } from '@/constants/permissions'

// Backend roles (auth/service.py ROLE_DEFAULT_PERMISSIONS, dev@4e426c0+).
export const BACKEND_ROLES = [
  {
    value: 'ADMIN',
    label: 'Admin',
    chip: 'ADMIN',
    tone: 'amb',
    help: 'Claims admin / reviewer. Whole hospital, every permission, MFA on sign-in.',
  },
  {
    value: 'MEMBER',
    label: 'Records staff',
    chip: 'STAFF',
    tone: 'teal',
    help: 'Whole hospital. Upload documents, re-scan, resolve to-dos. No claim desk, integrity, approve or submit.',
  },
  {
    value: 'VIEWER',
    label: 'Doctor',
    chip: 'DOCTOR',
    tone: 'teal',
    help: 'Only the patients granted below. Read documents and patients, see sent-back claims.',
  },
  {
    value: 'SUPER_ADMIN',
    label: 'Super admin',
    chip: 'SUPER ADMIN',
    tone: 'amb',
    help: 'Same permissions as Admin.',
  },
]

export const getRoleInfo = (role) =>
  BACKEND_ROLES.find((r) => r.value === String(role || '').toUpperCase()) || {
    value: role,
    label: role,
    chip: String(role || '').toUpperCase(),
    tone: 'grey',
    help: '',
  }

const ALL = Object.values(PERMISSIONS).filter((p) => p !== PERMISSIONS.TASKS_VIEW)

export const ROLE_DEFAULT_PERMISSIONS = {
  SUPER_ADMIN: ALL,
  ADMIN: ALL,
  MEMBER: [PERMISSIONS.FILES_UPLOAD, PERMISSIONS.DOCS_READ, PERMISSIONS.RAG_ASK, PERMISSIONS.TASKS_RESOLVE],
  VIEWER: [PERMISSIONS.DOCS_READ, PERMISSIONS.RAG_ASK, PERMISSIONS.TASKS_RESOLVE],
}

// Permissions an admin may hand out, in plain words.
export const PERMISSION_LABELS = [
  [PERMISSIONS.DOCS_READ, 'Read documents and patients'],
  [PERMISSIONS.FILES_UPLOAD, 'Upload files'],
  [PERMISSIONS.CLAIMS_INTAKE, 'Run claim intake'],
  [PERMISSIONS.GAPS_RUN, 'Run gap checks'],
  [PERMISSIONS.PACKETS_BUILD, 'Build claim packets'],
  [PERMISSIONS.INTEGRITY_VIEW, 'See integrity findings'],
  [PERMISSIONS.INTEGRITY_CLEAR, 'Clear integrity flags'],
  [PERMISSIONS.CLAIMS_APPROVE, 'Approve or send back claims'],
  [PERMISSIONS.CLAIMS_SUBMIT, 'Submit and requeue claims'],
  [PERMISSIONS.RAG_ASK, 'Ask questions (needs models)'],
  [PERMISSIONS.TASKS_RESOLVE, 'Resolve to-dos'],
  [PERMISSIONS.RULES_MANAGE, 'Manage rule books'],
  [PERMISSIONS.USERS_MANAGE, 'Manage users'],
]

/** True when the user's effective permissions are exactly the role defaults. */
export function usesRoleDefaults(user) {
  const defaults = ROLE_DEFAULT_PERMISSIONS[String(user?.role || '').toUpperCase()] || []
  const perms = user?.permissions || []
  return perms.length === defaults.length && defaults.every((p) => perms.includes(p))
}
