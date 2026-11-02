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
}

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
    PERMISSIONS.TASKS_VIEW,
    PERMISSIONS.RULES_MANAGE,
    PERMISSIONS.USERS_MANAGE,
  ],
  [ROLES.DOCTOR]: [
    PERMISSIONS.DOCS_READ,
    PERMISSIONS.RAG_ASK,
    PERMISSIONS.TASKS_RESOLVE,
    PERMISSIONS.TASKS_VIEW,
  ],
  [ROLES.RECORDS_STAFF]: [
    PERMISSIONS.FILES_UPLOAD,
    PERMISSIONS.DOCS_READ,
    PERMISSIONS.RAG_ASK,
    PERMISSIONS.CLAIMS_INTAKE,
    PERMISSIONS.TASKS_RESOLVE,
    PERMISSIONS.TASKS_VIEW,
  ],
  [ROLES.COMPLIANCE]: [
    PERMISSIONS.DOCS_READ,
    PERMISSIONS.INTEGRITY_VIEW,
    PERMISSIONS.INTEGRITY_CLEAR,
  ],
}

export function normalizeRole(role) {
  const upper = String(role || '').toUpperCase()
  if (upper === 'ADMIN') return ROLES.ADMIN
  if (upper === 'RECORDS_STAFF' || upper === 'STAFF') return ROLES.RECORDS_STAFF
  if (upper === 'COMPLIANCE') return ROLES.COMPLIANCE
  return ROLES.DOCTOR
}

export function isAdminRole(role) {
  const normalized = normalizeRole(role)
  return normalized === ROLES.ADMIN || normalized === ROLES.COMPLIANCE
}
