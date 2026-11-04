import { Chip } from '@/components/ui'

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
 * Dynamic review aggregating real document count, open gaps, blockers, and integrity flags.
 */
export function PreApprovalChecklist({
  verifiedDocCount = 0,
  totalDocCount = 0,
  softGaps = [],
  hardRejections = 0,
  integrityWarnings = [],
}) {
  const hasBlockers = hardRejections > 0
  const softCount = softGaps.length
  const integrityCount = integrityWarnings.length

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
            text={`${softCount} to fix: ${softGaps.slice(0, 3).join(', ')}${softCount > 3 ? '…' : ''}`}
          />
        ) : (
          <ChecklistDot tone="ok" symbol="✓" text="No open rule gaps" />
        )}

        {/* Blockers */}
        {hasBlockers ? (
          <ChecklistDot
            tone="red"
            symbol="✕"
            text={`${hardRejections} blocking ${hardRejections === 1 ? 'issue' : 'issues'} found`}
          />
        ) : (
          <ChecklistDot tone="ok" symbol="✓" text="Nothing blocks this claim" />
        )}

        {/* Integrity warnings */}
        {integrityCount > 0 ? (
          <ChecklistDot
            tone="amb"
            symbol="!"
            text={`Integrity: ${integrityCount} ${integrityCount === 1 ? 'warning' : 'warnings'} (${integrityWarnings.map((w) => w.check_type || 'flag').join(', ')})`}
          />
        ) : (
          <ChecklistDot tone="ok" symbol="✓" text="Integrity checks passed" />
        )}
      </div>
    </div>
  )
}

