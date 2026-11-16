import { useState } from 'react'
import { Button, ErrorBox, Note } from '@/components/ui'
import { getIntegrityCheckLabel } from '@/features/integrity/utils/integrityTypes'

/**
 * Integrity clearance (stage INTEGRITY_REVIEW).
 * While a flagged integrity run is not cleared, the backend refuses every approval
 * (409 INTEGRITY_REVIEW_PENDING). A reviewer with integrity:clear records why the flags
 * do not stop the claim: POST /reviews/{task_id}/integrity-clearance { version, rationale }.
 * The user who clears cannot also approve the claim (four-eyes rule).
 */
export function IntegrityClearanceForm({
  integrityFlag,
  integrityChecks = [],
  minChars = 10,
  onSubmit,
  loading = false,
  error = null,
}) {
  const [rationale, setRationale] = useState('')
  const [validationError, setValidationError] = useState('')

  const flagged = integrityChecks.filter((c) => c.result_flag !== 'PASS')

  const handleSubmit = (e) => {
    e.preventDefault()
    const trimmed = rationale.trim()
    if (trimmed.length < minChars) {
      setValidationError(`Add a reason of at least ${minChars} characters.`)
      return
    }
    setValidationError('')
    onSubmit?.(trimmed)
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
        gap: '12px',
      }}
    >
      <b style={{ fontSize: '15px' }}>Clear integrity flags first</b>
      <Note tone="plum">
        The integrity check came back {integrityFlag === 'HARD_FAIL' ? 'failed' : 'with warnings'}. Someone must
        clear these flags before the claim can be approved. You can still send it back to the hospital.
        Whoever clears the flags cannot approve the claim; another admin must.
      </Note>

      {flagged.length > 0 && (
        <ul className="small" style={{ margin: 0, paddingLeft: '18px', display: 'grid', gap: '4px' }}>
          {flagged.map((c) => (
            <li key={c.check_type}>
              <b>{getIntegrityCheckLabel(c.check_type)}</b>
              {c.degraded ? ' (ran with limited data)' : ''}: {c.summary}
            </li>
          ))}
        </ul>
      )}

      <div className="field">
        <label className="small muted" htmlFor="integrityClearanceReason">
          Why these flags do not stop the claim *
        </label>
        <textarea
          id="integrityClearanceReason"
          className="input"
          rows={3}
          value={rationale}
          disabled={loading}
          placeholder="e.g., Checked the original scan with the records team; the re-save was a rotation."
          onChange={(e) => {
            setRationale(e.target.value)
            setValidationError('')
          }}
        />
      </div>

      {validationError && <ErrorBox message={validationError} />}
      {error && <ErrorBox message={error.message || 'Could not clear the integrity flags.'} />}

      <div className="row">
        <Button variant="warn" type="submit" loading={loading} disabled={loading}>
          Clear integrity flags
        </Button>
      </div>
    </form>
  )
}
