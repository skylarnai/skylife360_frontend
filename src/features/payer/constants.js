// The claim at the payer (backend payer_gateway/state_machine.py, status scope payer_claim).
export const PAYER_STATUS_TONE = {
  SUBMITTED: 'teal',
  ACKNOWLEDGED: 'teal',
  UNDER_REVIEW: 'teal',
  QUERY_RAISED: 'amb',
  QUERY_RESPONDED: 'teal',
  APPROVED: 'ok',
  PARTIALLY_APPROVED: 'ok',
  REJECTED: 'red',
  APPEALED: 'teal',
  SETTLEMENT_PENDING: 'ok',
  SETTLED: 'ok',
  CLOSED: 'grey',
  WITHDRAWN: 'grey',
  SUBMISSION_FAILED: 'red',
}

export function getPayerStatusTone(status) {
  return PAYER_STATUS_TONE[String(status || '').toUpperCase()] || 'grey'
}

// POST /claims/submissions claim_type
export const CLAIM_TYPES = [
  { value: 'FINAL', label: 'Final (cashless, after discharge)' },
  { value: 'PREAUTH', label: 'Pre-authorisation' },
  { value: 'ENHANCEMENT', label: 'Enhancement (more than pre-authorised)' },
  { value: 'REIMBURSEMENT', label: 'Reimbursement' },
]

// Document types the payer asks for (mock_standard_v1 profile) and that a submission can add.
export const PAYER_DOCUMENT_TYPES = [
  'DISCHARGE_SUMMARY',
  'FINAL_BILL',
  'INVESTIGATION_REPORTS',
  'CLINICAL_NOTES',
  'TREATING_DOCTOR_NOTES',
  'PREVIOUS_TREATMENT_RECORDS',
  'ID_PROOF',
  'POLICY_CARD',
  'MLC_COPY',
]

export function documentLabel(code) {
  const text = String(code || '')
    .replace(/_/g, ' ')
    .toLowerCase()
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export const RISK_BAND_TONE = { LOW: 'ok', MEDIUM: 'amb', HIGH: 'red' }

export const DECISION_TONE = { APPROVED: 'ok', PARTIAL: 'ok', QUERY: 'amb', REJECTED: 'red' }
