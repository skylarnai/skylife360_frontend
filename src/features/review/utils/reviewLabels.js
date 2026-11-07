import { getIntegrityCheckLabel } from '@/features/integrity/utils/integrityTypes'

// Codes from the backend review assessment (f006_human_validation/assessment.py).
const REVIEW_CODE_LABELS = {
  GAP_HARD_REJECTION: 'A rule gap rejects this claim',
  PACKET_FORMAT_INVALID: 'The claim packet failed format validation',
  INTEGRITY_NOT_COMPLETED: 'The integrity check has not finished',
  INTEGRITY_HARD_FAIL: 'Integrity check failed',
  GAP_SOFT_GAPS: 'Open rule gaps to fix',
  MEDGEMMA_GAPS: 'AI-reviewed gaps',
  QUARANTINED_SECTIONS: 'Some packet sections were set aside',
  UNMAPPED_CODES: 'Some codes could not be mapped',
  PACKET_QUARANTINED: 'The claim packet was set aside for review',
  INTEGRITY_SOFT_WARN: 'Integrity warning',
  DOCUMENT_IDENTITY_MISMATCH: 'The documents name a different patient',
}

// Users without integrity:view get these codes without the ":<CHECK>" suffix (the check name is hidden).
const INTEGRITY_CODES_WITHOUT_CHECK = {
  INTEGRITY_HARD_FAIL: 'An integrity check needs attention',
  INTEGRITY_SOFT_WARN: 'An integrity check needs attention',
}

/**
 * "INTEGRITY_HARD_FAIL:EXACT_DUPE" -> "Integrity check failed: Duplicate documents"
 * "INTEGRITY_HARD_FAIL" (no integrity:view) -> "An integrity check needs attention"
 */
export function getReviewCodeLabel(code) {
  if (!code) return ''
  const [base, detail] = String(code).split(':')
  if (!detail && INTEGRITY_CODES_WITHOUT_CHECK[base]) return INTEGRITY_CODES_WITHOUT_CHECK[base]
  const label = REVIEW_CODE_LABELS[base] || base
  return detail ? `${label}: ${getIntegrityCheckLabel(detail)}` : label
}

export const REVIEW_STAGE_INTEGRITY = 'INTEGRITY_REVIEW'
