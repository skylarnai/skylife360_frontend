import { useState } from 'react'
import { Button, ErrorBox, Pill } from '@/components/ui'

const STAGES = [
  { key: 'QUEUED', label: 'Queued' },
  { key: 'DISPATCHING', label: 'Sending' },
  { key: 'SUBMITTED', label: 'Received by payer' },
]

// Backend statuses (f006 submission/status.py)
const STAGE_INDEX = {
  QUEUED: 0,
  DISPATCHING: 1,
  RETRY_SCHEDULED: 1,
  SUBMITTED: 2,
}

function formatTime(value) {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString()
}

/**
 * Submission progress (APP-05): QUEUED -> DISPATCHING (-> RETRY_SCHEDULED) -> SUBMITTED.
 * PAYER_REJECTED: the payer refused the claim (final, no requeue).
 * DEAD_LETTERED: every attempt failed; the only state the backend lets you requeue (with a reason).
 */
export function SubmissionTracker({
  submission,
  payerName = 'the payer',
  onRequeue,
  isRequeueing = false,
  requeueError = null,
}) {
  const [reason, setReason] = useState('')

  if (!submission) return null

  const currentStatus = String(submission.status || 'QUEUED').toUpperCase()
  const isSubmitted = currentStatus === 'SUBMITTED'
  const isPayerRejected = currentStatus === 'PAYER_REJECTED'
  const isDeadLettered = currentStatus === 'DEAD_LETTERED'
  const isRetrying = currentStatus === 'RETRY_SCHEDULED'
  const isFailed = isPayerRejected || isDeadLettered
  const activeIdx = STAGE_INDEX[currentStatus] ?? 0

  // last_error_message: the payer's or dispatcher's detail, else plain English for the code.
  const errorText = [
    submission.last_error_message,
    submission.last_error_code ? `(${submission.last_error_code})` : '',
  ]
    .filter(Boolean)
    .join(' ')

  const pillTone = isSubmitted ? 'ok' : isFailed ? 'red' : isRetrying ? 'amb' : 'teal'

  return (
    <div
      style={{
        border: '1px solid var(--line)',
        borderRadius: '8px',
        padding: '16px',
        background: 'var(--panel)',
        display: 'grid',
        gap: '12px',
      }}
    >
      <div className="between" style={{ alignItems: 'center' }}>
        <b style={{ fontSize: '15px' }}>Submission</b>
        <Pill tone={pillTone}>{submission.status_label || currentStatus}</Pill>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '8px',
          textAlign: 'center',
        }}
      >
        {STAGES.map((stg, idx) => {
          const isDone = !isFailed && (activeIdx > idx || (isSubmitted && idx === 2))
          const isCurrent = !isFailed && !isSubmitted && activeIdx === idx
          const label = idx === 2 ? `Received by ${payerName}` : stg.label

          return (
            <div
              key={stg.key}
              style={{
                padding: '10px 8px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                background: isDone ? 'var(--soft)' : isCurrent ? 'var(--tint)' : 'var(--surface)',
                border: `1px solid ${isCurrent ? 'var(--accent)' : 'var(--line)'}`,
                color: isDone ? 'var(--ok)' : isCurrent ? 'var(--accent)' : 'var(--muted)',
              }}
            >
              {isDone ? '✓ ' : ''}
              {label}
            </div>
          )
        })}
      </div>

      <div className="small muted">
        Attempt {submission.attempt_count ?? 0} of {submission.max_attempts ?? '–'}
        {isRetrying && submission.next_attempt_at
          ? ` · next try at ${formatTime(submission.next_attempt_at)}`
          : ''}
        {errorText && !isSubmitted && !isFailed ? ` · last error: ${errorText}` : ''}
      </div>

      {isSubmitted && (
        <div className="small muted">
          Payer reference: <b>{submission.payer_claim_reference || submission.submission_id}</b>. If
          the payer returns any queries or a rejection, it will appear in your worklist.
        </div>
      )}

      {isPayerRejected && (
        <div style={{ color: 'var(--red)', fontSize: '13.5px' }}>
          {payerName} rejected this claim{errorText ? `: ${errorText}` : ''}. It cannot be resent as
          is.
        </div>
      )}

      {isDeadLettered && (
        <div style={{ display: 'grid', gap: '8px' }}>
          <span style={{ color: 'var(--red)', fontSize: '13.5px' }}>
            Sending failed after every attempt{errorText ? `: ${errorText}` : ''}.
            {onRequeue
              ? ' Give a reason to try again.'
              : ' Someone with the claims:submit permission can requeue it.'}
          </span>
          {onRequeue && (
            <>
              <textarea
                className="input"
                rows={2}
                maxLength={2000}
                value={reason}
                disabled={isRequeueing}
                placeholder="e.g., Payer endpoint was down; confirmed back up with the TPA."
                onChange={(e) => setReason(e.target.value)}
              />
              <div className="row">
                <Button
                  size="sm"
                  variant="warn"
                  loading={isRequeueing}
                  disabled={!reason.trim() || isRequeueing}
                  onClick={() => onRequeue?.(reason.trim())}
                >
                  Requeue
                </Button>
              </div>
            </>
          )}
          {requeueError && <ErrorBox message={requeueError.message || 'Requeue failed.'} />}
        </div>
      )}
    </div>
  )
}
