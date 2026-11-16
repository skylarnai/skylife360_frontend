import { useState } from 'react'
import { Button, ErrorBox, Note } from '@/components/ui'
import { getIntegrityCheckLabel } from '@/features/integrity/utils/integrityTypes'
import { getReviewCodeLabel } from '../utils/reviewLabels'

const DECISION_OPTIONS = [
  { value: 'APPROVED', label: 'Approve' },
  { value: 'FALSE_POSITIVE', label: 'Approve · the integrity warning is a false alarm' },
  { value: 'REJECTED', label: 'Send back to the hospital' },
]

/**
 * Adjudication Form (APP-04)
 * Everything comes from the review task (GET /reviews/{task_id}):
 *   blockers            no one may approve over these (backend: 409 APPROVAL_BLOCKED)
 *   flags               approving over them needs a rationale (400 MISSING_RATIONALE)
 *   integrity_checks    only false_positive_eligible ones may be sent as false_positive_checks
 *   rationale_min_chars the backend's minimum
 * integrityPending: stage INTEGRITY_REVIEW, approvals wait for an integrity clearance.
 */
export function AdjudicationForm({
  blockers = [],
  flags = [],
  integrityChecks = [],
  minChars = 10,
  integrityPending = false,
  onSubmit,
  loading = false,
  error = null,
}) {
  const hasBlockers = blockers.length > 0
  const approvalsLocked = hasBlockers || integrityPending
  const eligibleFalsePositives = integrityChecks.filter((c) => c.false_positive_eligible)

  const [selectedDecision, setSelectedDecision] = useState(approvalsLocked ? 'REJECTED' : '')
  const [rationale, setRationale] = useState('')
  const [validationError, setValidationError] = useState('')

  // The backend needs a rationale to approve over flags, to mark false positives, and to reject a
  // claim it recommends approving. We ask for one on every rejection so the hospital knows what to fix.
  const requiresRationale =
    selectedDecision === 'FALSE_POSITIVE' ||
    selectedDecision === 'REJECTED' ||
    (selectedDecision === 'APPROVED' && flags.length > 0)

  const isOptionDisabled = (value) => {
    if (value === 'REJECTED') return false
    if (approvalsLocked) return true
    return value === 'FALSE_POSITIVE' && eligibleFalsePositives.length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setValidationError('')

    if (!selectedDecision) {
      setValidationError('Choose a decision.')
      return
    }
    if (isOptionDisabled(selectedDecision)) {
      setValidationError('This decision is not available for this claim.')
      return
    }

    const trimmedRationale = rationale.trim()
    if (requiresRationale && trimmedRationale.length < minChars) {
      setValidationError(`Add a short reason (at least ${minChars} characters).`)
      return
    }

    onSubmit?.({
      decision: selectedDecision,
      rationale: trimmedRationale || null,
      false_positive_checks:
        selectedDecision === 'FALSE_POSITIVE' ? eligibleFalsePositives.map((c) => c.check_type) : [],
      // Empty: the backend sends the gap report to the packet's own hospital user.
      gap_report_recipients: [],
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        border: '1px solid var(--line)',
        borderRadius: '8px',
        padding: '16px',
        background: 'var(--panel)',
        display: 'grid',
        gap: '14px',
      }}
    >
      <b style={{ fontSize: '15px' }}>Decision</b>

      <div style={{ display: 'grid', gap: '8px' }}>
        {DECISION_OPTIONS.map((opt) => {
          const isDisabled = isOptionDisabled(opt.value)
          return (
            <label
              key={opt.value}
              className="row"
              style={{
                gap: '8px',
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                opacity: isDisabled ? 0.5 : 1,
                fontSize: '14px',
              }}
            >
              <input
                type="radio"
                name="decision"
                value={opt.value}
                checked={selectedDecision === opt.value}
                disabled={isDisabled || loading}
                onChange={() => {
                  setSelectedDecision(opt.value)
                  setValidationError('')
                }}
              />
              <span>{opt.label}</span>
            </label>
          )
        })}
      </div>

      {hasBlockers && (
        <Note tone="red">
          This claim cannot be approved: {blockers.map(getReviewCodeLabel).join('; ')}.
        </Note>
      )}

      {!hasBlockers && integrityPending && (
        <Note tone="plum">Approval opens once the integrity flags are cleared.</Note>
      )}

      {selectedDecision === 'APPROVED' && flags.length > 0 && (
        <Note>You are approving over: {flags.map(getReviewCodeLabel).join('; ')}.</Note>
      )}

      {selectedDecision === 'FALSE_POSITIVE' && eligibleFalsePositives.length > 0 && (
        <Note>
          These warnings will be recorded as false alarms:{' '}
          {eligibleFalsePositives.map((c) => getIntegrityCheckLabel(c.check_type)).join(', ')}.
        </Note>
      )}

      {requiresRationale && (
        <div className="field">
          <label className="small muted" htmlFor="adjudicationReason">
            Reason (required when you override a warning or send the claim back) *
          </label>
          <textarea
            id="adjudicationReason"
            className="input"
            rows={3}
            required
            placeholder="e.g., Image was cropped/rotated by records staff, or discharge summary not yet signed…"
            value={rationale}
            disabled={loading}
            onChange={(e) => {
              setRationale(e.target.value)
              setValidationError('')
            }}
          />
        </div>
      )}

      {validationError && <ErrorBox message={validationError} />}
      {error && <ErrorBox message={error.message || 'Adjudication failed.'} />}

      <div className="row" style={{ marginTop: '4px' }}>
        <Button variant="acc" type="submit" loading={loading} disabled={!selectedDecision || loading}>
          Confirm decision
        </Button>
      </div>
    </form>
  )
}
