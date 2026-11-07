import { Chip } from '@/components/ui'
import { getIntegrityCheckLabel } from '@/features/integrity/utils/integrityTypes'
import { getReviewCodeLabel } from '../utils/reviewLabels'

function ChecklistDot({ tone, symbol, text }) {
  return (
    <div className="row" style={{ gap: '8px', fontSize: '14px', alignItems: 'flex-start' }}>
      <Chip
        tone={tone}
        style={{
          borderRadius: '50%',
          width: '20px',
          height: '20px',
          padding: 0,
          display: 'inline-grid',
          placeItems: 'center',
          flexShrink: 0,
          fontSize: '11px',
          fontWeight: 700,
        }}
      >
        {symbol}
      </Chip>
      <span style={{ lineHeight: 1.45 }}>{text}</span>
    </div>
  )
}

/**
 * Pre-approval checklist (APP-03)
 * Document counts come from the batch; gaps, blockers, flags and integrity results come from
 * the review task (GET /reviews/{task_id}), the same assessment the backend enforces.
 */
export function PreApprovalChecklist({
  verifiedDocCount = 0,
  totalDocCount = 0,
  softGapCount = 0,
  blockers = [],
  flags = [],
  integrityChecks = [],
  // false for users without integrity:view: the backend sends integrity_checks: [] and integrity_flag: null.
  canViewIntegrity = true,
}) {
  const hasBlockers = blockers.length > 0
  const softCount = softGapCount
  const integrityWarnings = integrityChecks.filter((c) => c.result_flag !== 'PASS')
  const integrityCount = integrityWarnings.length
  const otherFlags = flags.filter((f) => f !== 'GAP_SOFT_GAPS')

  const allDocsRead = totalDocCount > 0 && verifiedDocCount >= totalDocCount

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
      <b style={{ fontSize: '15px' }}>Before you approve</b>

      <div style={{ display: 'grid', gap: '10px' }}>
        {/* Document reading */}
        <ChecklistDot
          tone={allDocsRead ? 'ok' : 'amb'}
          symbol={allDocsRead ? '✓' : '!'}
          text={
            totalDocCount > 0
              ? `${verifiedDocCount} of ${totalDocCount} documents read`
              : 'Documents verified and read'
          }
        />

        {/* Soft gaps */}
        {softCount > 0 ? (
          <ChecklistDot
            tone="amb"
            symbol="!"
            text={`${softCount} open rule ${softCount === 1 ? 'gap' : 'gaps'} to fix`}
          />
        ) : (
          <ChecklistDot tone="ok" symbol="✓" text="No open rule gaps" />
        )}

        {/* Blockers */}
        {hasBlockers ? (
          <ChecklistDot
            tone="red"
            symbol="✕"
            text={`Blocking: ${blockers.map(getReviewCodeLabel).join('; ')}`}
          />
        ) : (
          <ChecklistDot tone="ok" symbol="✓" text="Nothing blocks this claim" />
        )}

        {/* Other flags that need a reason to approve over */}
        {otherFlags.length > 0 && (
          <ChecklistDot
            tone="amb"
            symbol="!"
            text={`Needs a reason to approve: ${otherFlags.map(getReviewCodeLabel).join('; ')}`}
          />
        )}

        {/* Integrity warnings */}
        {!canViewIntegrity ? (
          <ChecklistDot
            tone="grey"
            symbol="–"
            text="Integrity results are shown to integrity reviewers only"
          />
        ) : integrityCount > 0 ? (
          <ChecklistDot
            tone={integrityWarnings.some((w) => w.result_flag === 'HARD_FAIL') ? 'red' : 'amb'}
            symbol="!"
            text={`Integrity: ${integrityCount} ${integrityCount === 1 ? 'finding' : 'findings'} (${integrityWarnings
              .map(
                (w) => getIntegrityCheckLabel(w.check_type) + (w.degraded ? ', limited data' : ''),
              )
              .join('; ')})`}
          />
        ) : (
          <ChecklistDot tone="ok" symbol="✓" text="Integrity checks passed" />
        )}
      </div>
    </div>
  )
}
