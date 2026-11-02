export const FILE_STATUS_MAP = {
  INDEXED: { label: 'READY', tone: 'ok' },
  DUPLICATE: { label: 'DUPLICATE COPY', tone: 'amb' },
  EXTRACTION_FAILED: { label: "COULDN'T READ", tone: 'red' },
  PENDING: { label: 'IN PROGRESS', tone: 'teal' },
  PROCESSING: { label: 'IN PROGRESS', tone: 'teal' },
}

export const DOC_TYPE_MAP = {
  admission: 'Admission',
  lab: 'Lab / imaging',
  operative: 'Operation',
  discharge: 'Discharge',
  billing: 'Billing',
}

export const CLAIM_STAGE_MAP = {
  'Pre-auth': { label: 'PRE-AUTH', tone: 'teal' },
  'In treatment': { label: 'IN TREATMENT', tone: 'teal' },
  Submitted: { label: 'SUBMITTED', tone: 'teal' },
  Discharge: { label: 'DISCHARGE', tone: 'amb' },
  'Pre-submission': { label: 'PRE-SUBMISSION', tone: 'amb' },
  Settled: { label: 'SETTLED', tone: 'ok' },
}

export const INTEGRITY_FLAG_MAP = {
  PASS: { label: 'PASSED', tone: 'ok' },
  SOFT_WARN: { label: 'CHECK', tone: 'amb' },
  HARD_FAIL: { label: 'FAILED', tone: 'red' },
}

export const API_TAG_MAP = {
  READY: { label: 'READY', tone: 'ok' },
  NEEDED: { label: 'NEEDED', tone: 'amb' },
}

export function getFileStatusInfo(status) {
  return FILE_STATUS_MAP[status] || { label: String(status || 'UNKNOWN'), tone: 'grey' }
}

export function getDocTypeLabel(type) {
  return DOC_TYPE_MAP[type] || String(type || '')
}

export function getClaimStageInfo(stage) {
  return CLAIM_STAGE_MAP[stage] || { label: String(stage || '').toUpperCase(), tone: 'grey' }
}

export function getIntegrityFlagInfo(flag) {
  return INTEGRITY_FLAG_MAP[flag] || { label: String(flag || '').toUpperCase(), tone: 'grey' }
}
