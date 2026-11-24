export const INTEGRITY_CHECK_LABELS = {
  EXACT_DUPE: 'Duplicate documents',
  SEMANTIC_DUPE: 'Resubmitted claim',
  FUZZY_MATCH: 'Pre-existing condition / identity match',
  TAMPERING: 'Document tampering',
  ID_VERIFY: 'Policy and ID checks',
  ANOMALY: 'Unusual billing',
}

export function getIntegrityCheckLabel(checkType) {
  return INTEGRITY_CHECK_LABELS[checkType] || checkType || 'Integrity Check'
}

