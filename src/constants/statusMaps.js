export const FILE_STATUS_MAP = {
  INDEXED: { label: 'READY', tone: 'ok' },
  DUPLICATE: { label: 'DUPLICATE COPY', tone: 'amb' },
  EXTRACTION_FAILED: { label: "COULDN'T READ", tone: 'red' },
  PENDING: { label: 'IN PROGRESS', tone: 'teal' },
  PROCESSING: { label: 'IN PROGRESS', tone: 'teal' },
}

const UPLOAD_IN_PROGRESS = { label: 'IN PROGRESS', tone: 'teal' }
const UPLOAD_FAILED = { label: 'FAILED', tone: 'red' }

// Storage status of an uploaded file (backend FileStatus, `files[].status`)
export const INGESTION_STATUS_MAP = {
  INGESTED: { label: 'ACCEPTED', tone: 'ok' },
  DUPLICATE: { label: 'DUPLICATE', tone: 'amb' },
  REJECTED: { label: 'NOT ALLOWED', tone: 'red' },
  UPLOAD_FAILED,
  RETRY_PENDING: UPLOAD_FAILED,
  METADATA_PENDING: UPLOAD_FAILED,
  CANCELLED: UPLOAD_FAILED,
  RECEIVED: UPLOAD_IN_PROGRESS,
  VALIDATING: UPLOAD_IN_PROGRESS,
  READY_TO_UPLOAD: UPLOAD_IN_PROGRESS,
  UPLOADING: UPLOAD_IN_PROGRESS,
  UPLOADED: UPLOAD_IN_PROGRESS,
  VERIFYING: UPLOAD_IN_PROGRESS,
  STORAGE_VERIFIED: UPLOAD_IN_PROGRESS,
}

const READING = { label: 'READING…', tone: 'teal' }
const COULD_NOT_READ = { label: "COULDN'T READ", tone: 'red' }

// Text-extraction status of a stored file (backend ExtractionStatus, `files[].extraction.status`)
export const EXTRACTION_STATUS_MAP = {
  INDEXED: { label: 'READY', tone: 'ok' },
  EXTRACTION_FAILED: COULD_NOT_READ,
  CLEANING_FAILED: COULD_NOT_READ,
  CHUNKING_FAILED: COULD_NOT_READ,
  EMBEDDING_FAILED: COULD_NOT_READ,
  PENDING: READING,
  EXTRACTING: READING,
  EXTRACTED: READING,
  CLEANING: READING,
  CLEANED: READING,
  CHUNKING: READING,
  CHUNKED: READING,
  EMBEDDING: READING,
  EMBEDDED: READING,
  STORING_VECTORS: READING,
  METADATA_PENDING: READING,
}

export function getIngestionStatusInfo(status) {
  return INGESTION_STATUS_MAP[status] || UPLOAD_IN_PROGRESS
}

export function getExtractionStatusInfo(status) {
  return EXTRACTION_STATUS_MAP[status] || READING
}

/** True while the backend is still reading text from the file. */
export function isExtractionInProgress(status) {
  return getExtractionStatusInfo(status) === READING
}

export const DOC_TYPE_MAP = {
  admission: 'Admission',
  lab: 'Lab / imaging',
  operative: 'Operation',
  discharge: 'Discharge',
  billing: 'Billing',
  prescription: 'Prescription',
  identity: 'Identity',
  insurance: 'Insurance',
  other: 'Other',
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

// Claim worklist `pipeline_stage` (GET /claims, from the claim's latest packet). null = no packet yet.
export const PIPELINE_STAGE_MAP = {
  IN_PIPELINE: { label: 'CHECKING', tone: 'grey' },
  IN_REVIEW: { label: 'IN REVIEW', tone: 'amb' },
  APPROVED: { label: 'APPROVED', tone: 'ok' },
  REJECTED: { label: 'REJECTED', tone: 'red' },
  SENT_BACK: { label: 'SENT BACK', tone: 'amb' },
  READY_TO_RECHECK: { label: 'READY TO RECHECK', tone: 'ok' },
  SUBMITTING: { label: 'SUBMITTING', tone: 'grey' },
  SUBMITTED: { label: 'SUBMITTED', tone: 'ok' },
  // Refused as invalid at the payer's intake (never reviewed)
  PAYER_REJECTED: { label: 'PAYER REJECTED', tone: 'red' },
  SUBMISSION_FAILED: { label: 'SEND FAILED', tone: 'red' },
  // Once the payer acknowledged the submission, the stage follows the payer (payer gateway)
  WITH_PAYER: { label: 'WITH PAYER', tone: 'teal' },
  PAYER_QUERY: { label: 'PAYER QUERY', tone: 'amb' },
  PAYER_APPROVED: { label: 'PAYER APPROVED', tone: 'ok' },
  PAYER_PARTIALLY_APPROVED: { label: 'PARTLY APPROVED', tone: 'ok' },
  PAYER_DENIED: { label: 'PAYER DENIED', tone: 'red' },
  PAYER_APPEALED: { label: 'APPEALED', tone: 'teal' },
  SETTLEMENT_PENDING: { label: 'PAYMENT PENDING', tone: 'ok' },
  SETTLED: { label: 'SETTLED', tone: 'ok' },
  CLOSED: { label: 'CLOSED', tone: 'grey' },
  WITHDRAWN: { label: 'WITHDRAWN', tone: 'grey' },
}

export function getPipelineStageInfo(stage) {
  if (!stage) return null
  return PIPELINE_STAGE_MAP[stage] || { label: String(stage).replace(/_/g, ' '), tone: 'grey' }
}
