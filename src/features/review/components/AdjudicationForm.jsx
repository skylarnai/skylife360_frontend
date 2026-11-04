import { useState } from 'react'
import { Button, ErrorBox, Note } from '@/components/ui'

const DECISION_OPTIONS = [
  { value: 'APPROVED', label: 'Approve' },
  { value: 'FALSE_POSITIVE', label: 'Approve · the integrity warning is a false alarm' },
  { value: 'REJECTED', label: 'Send back to the hospital' },
]

/**
 * Adjudication Form (APP-04)
 * Allows the claims admin to choose a decision, validates mandatory rationale,
 * and submits with optimistic version protection.
 */
export function AdjudicationForm({
  hasBlockers = false,
  integrityWarnings = [],
  onSubmit,
  loading = false,
  error = null,
}) {
  const [selectedDecision, setSelectedDecision] = useState(hasBlockers ? 'REJECTED' : '')
  const [rationale, setRationale] = useState('')
  const [validationError, setValidationError] = useState('')

  const requiresRationale =
    selectedDecision === 'FALSE_POSITIVE' || selectedDecision === 'REJECTED'

  const handleSubmit = (e) => {
    e.preventDefault()
    setValidationError('')

    if (!selectedDecision) {
      setValidationError('Choose a decision.')
      return
    }

    if (hasBlockers && selectedDecision !== 'REJECTED') {
      setValidationError('Claims with blocking issues cannot be approved. Send back to the hospital.')
      return
    }

    const trimmedRationale = rationale.trim()
    if (requiresRationale && trimmedRationale.length < 10) {
      setValidationError('Add a short reason (at least 10 characters).')
      return
    }

    const falsePositiveChecks =
      selectedDecision === 'FALSE_POSITIVE'
        ? integrityWarnings.map((w) => w.check_type).filter(Boolean)
        : []

    onSubmit?.({
      decision: selectedDecision,
      rationale: trimmedRationale,
      false_positive_checks: falsePositiveChecks,
      gap_report_recipients: selectedDecision === 'REJECTED' ? ['Dr. S. Menon'] : [],
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
          const isApprove = opt.value === 'APPROVED' || opt.value === 'FALSE_POSITIVE'
          const isDisabled = hasBlockers && isApprove

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
          This claim has blocking issues. Approvals are disabled until the hospital fixes them.
        </Note>
      )}

      {requiresRationale && (
        <div className="field">
          <label className="small muted">
            Reason (required when you override a warning or send the claim back) *
          </label>
          <textarea
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

