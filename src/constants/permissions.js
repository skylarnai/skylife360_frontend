export const ROLES = {
  ADMIN: 'ADMIN',
  DOCTOR: 'DOCTOR',
  RECORDS_STAFF: 'RECORDS_STAFF',
  COMPLIANCE: 'COMPLIANCE',
}

export const PERMISSIONS = {
  FILES_UPLOAD: 'files:upload',
  DOCS_READ: 'docs:read',
  RAG_ASK: 'rag:ask',
  CLAIMS_INTAKE: 'claims:intake',
  GAPS_RUN: 'gaps:run',
  PACKETS_BUILD: 'packets:build',
  INTEGRITY_VIEW: 'integrity:view',
  INTEGRITY_CLEAR: 'integrity:clear',
  CLAIMS_APPROVE: 'claims:approve',
  CLAIMS_SUBMIT: 'claims:submit',
  TASKS_RESOLVE: 'tasks:resolve',
  TASKS_VIEW: 'tasks:view',
  RULES_MANAGE: 'rules:manage',
  USERS_MANAGE: 'users:manage',
  // Original (unmasked) document text and files; ADMIN / SUPER_ADMIN by default.
  PHI_UNMASKED: 'phi:unmasked',
}

// Fallback only: used when /auth/me returns no `permissions` list. The backend list always wins
// (an admin can give any user custom permissions). Mirrors the backend defaults: MEMBER has no
// integrity:view / integrity:clear / claims:approve, and no claim desk (claims:intake / gaps:run /
// packets:build): the admin creates claims and runs Check gaps; staff upload, re-scan and resolve to-dos.
export const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: [
    PERMISSIONS.FILES_UPLOAD,
    PERMISSIONS.DOCS_READ,
    PERMISSIONS.RAG_ASK,
    PERMISSIONS.CLAIMS_INTAKE,
    PERMISSIONS.GAPS_RUN,
    PERMISSIONS.PACKETS_BUILD,
    PERMISSIONS.INTEGRITY_VIEW,
    PERMISSIONS.INTEGRITY_CLEAR,
    PERMISSIONS.CLAIMS_APPROVE,
    PERMISSIONS.CLAIMS_SUBMIT,
    PERMISSIONS.TASKS_RESOLVE,
    PERMISSIONS.TASKS_VIEW,
    PERMISSIONS.RULES_MANAGE,
    PERMISSIONS.USERS_MANAGE,
    PERMISSIONS.PHI_UNMASKED,
  ],
  // Backend VIEWER (normalizeRole maps VIEWER -> DOCTOR)
  [ROLES.DOCTOR]: [PERMISSIONS.DOCS_READ, PERMISSIONS.RAG_ASK, PERMISSIONS.TASKS_RESOLVE],
  // Backend MEMBER
  [ROLES.RECORDS_STAFF]: [
    PERMISSIONS.FILES_UPLOAD,
    PERMISSIONS.DOCS_READ,
    PERMISSIONS.RAG_ASK,
    PERMISSIONS.TASKS_RESOLVE,
  ],
  [ROLES.COMPLIANCE]: [
    PERMISSIONS.DOCS_READ,
    PERMISSIONS.INTEGRITY_VIEW,
    PERMISSIONS.INTEGRITY_CLEAR,
  ],
}

// Any one of these opens the Claims worklist and the claim desk, whatever the role
// (e.g. a doctor who is also a reviewer). The backend enforces each action separately.
export const CLAIM_DESK_PERMISSIONS = [
  PERMISSIONS.CLAIMS_INTAKE,
  PERMISSIONS.GAPS_RUN,
  PERMISSIONS.CLAIMS_APPROVE,
  PERMISSIONS.CLAIMS_SUBMIT,
  PERMISSIONS.INTEGRITY_VIEW,
  PERMISSIONS.INTEGRITY_CLEAR,
]

export function hasAnyPermission(permissions = [], required = []) {
  if (!required || required.length === 0) return true
  return required.some((perm) => permissions.includes(perm))
}

/** Admins always; anyone else only with a reviewer permission. */
export function canUseClaimDesk(role, permissions = []) {
  return isAdminRole(role) || hasAnyPermission(permissions, CLAIM_DESK_PERMISSIONS)
}

export function normalizeRole(role) {
  const upper = String(role || '').toUpperCase()
  if (upper === 'ADMIN' || upper === 'SUPER_ADMIN') return ROLES.ADMIN
  if (upper === 'RECORDS_STAFF' || upper === 'STAFF') return ROLES.RECORDS_STAFF
  if (upper === 'COMPLIANCE') return ROLES.COMPLIANCE
  if (upper === 'MEMBER' || upper === 'DOCTOR') return ROLES.DOCTOR
  if (upper === 'VIEWER') return ROLES.DOCTOR
  return ROLES.DOCTOR
}

export function isAdminRole(role) {
  const normalized = normalizeRole(role)
  return normalized === ROLES.ADMIN || normalized === ROLES.COMPLIANCE
}
