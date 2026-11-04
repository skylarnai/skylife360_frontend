import { Button, Pill } from '@/components/ui'

const STAGES = [
  { key: 'QUEUED', label: 'Queued' },
  { key: 'DISPATCHING', label: 'Dispatching' },
  { key: 'SUBMITTED', label: 'Received by Payer' },
]

/**
 * Visual Progress Stepper for Claim Submissions (APP-05).
 * Shows QUEUED -> DISPATCHING -> SUBMITTED with payer reference.
 */
export function SubmissionTracker({ submission, payerName = 'TPA', onRequeue, isRequeueing = false }) {
  if (!submission) return null

  const currentStatus = (submission.status || 'QUEUED').toUpperCase()
  const isFailed = currentStatus === 'FAILED'
  const isSubmitted = currentStatus === 'SUBMITTED'

  const getStageIndex = (status) => {
    switch (status) {
      case 'QUEUED':
        return 0
      case 'DISPATCHING':
        return 1
      case 'SUBMITTED':
        return 2
      default:
        return 0
    }
  }

  const activeIdx = getStageIndex(currentStatus)

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
        <b style={{ fontSize: '15px' }}>Submission Tracker</b>
        <Pill tone={isSubmitted ? 'ok' : isFailed ? 'red' : 'teal'}>
          {submission.status_label || currentStatus}
        </Pill>
      </div>

      {/* 3-Step Flow */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '8px',
          textAlign: 'center',
        }}
      >
        {STAGES.map((stg, idx) => {
          const isDone = !isFailed && activeIdx > idx
          const isCurrent = !isFailed && activeIdx === idx
          const label = idx === 2 ? `Received by ${payerName}` : stg.label

          return (
            <div
              key={stg.key}
              style={{
                padding: '10px 8px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                background: isDone
                  ? 'var(--soft)'
                  : isCurrent
                  ? 'var(--tint)'
                  : 'var(--surface)',
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

      {isSubmitted && (
        <div className="small muted">
          Payer reference: <b>{submission.payer_reference || submission.submission_id}</b>.
          If the payer returns any queries or rejection, it will appear in your worklist.
        </div>
      )}

      {isFailed && (
        <div className="row" style={{ gap: '10px', alignItems: 'center' }}>
          <span style={{ color: 'var(--red)', fontSize: '13.5px' }}>
            Submission dispatch failed: {submission.error_message || 'Timeout or network refusal.'}
          </span>
          <Button size="sm" variant="warn" loading={isRequeueing} onClick={onRequeue}>
            Requeue dispatch
          </Button>
        </div>
      )}
    </div>
  )
}

