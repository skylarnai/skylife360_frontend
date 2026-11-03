import { Chip, Pill } from '@/components/ui'

/**
 * Renders the Gap Check Outcome Banner, Identity Status, and categorized findings list (GAP-05).
 */
export function GapFindingList({ gapRun, identityCheck }) {
  if (!gapRun) return null

  const outcome = gapRun.outcome || 'conditional'
  const hardCount = gapRun.hard_rejections ?? 0
  const softCount = gapRun.soft_gaps ?? 0
  const passedCount = gapRun.rules_passed ?? 0

  let bannerTone = 'amb'
  let bannerText = `${softCount} to fix before submitting`

  if (outcome === 'eligible' || (hardCount === 0 && softCount === 0)) {
    bannerTone = 'ok'
    bannerText = 'Nothing blocks this claim'
  } else if (outcome === 'not_eligible' || hardCount > 0) {
    bannerTone = 'red'
    bannerText = `${hardCount} blocking ${hardCount === 1 ? 'issue' : 'issues'} · Payer will reject this claim`
  }

  const findings = gapRun.findings || []

  return (
    <div style={{ display: 'grid', gap: '12px' }}>
      {/* Identity Check Banner if present */}
      {identityCheck && identityCheck.status && (
        <div
          className="row"
          style={{
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '13.5px',
            background:
              identityCheck.status === 'MATCH'
                ? 'var(--soft)'
                : identityCheck.status === 'MISMATCH'
                ? 'var(--red-bg)'
                : 'var(--surface)',
            color: identityCheck.status === 'MISMATCH' ? 'var(--red)' : 'var(--fg)',
            border: `1px solid ${identityCheck.status === 'MISMATCH' ? 'var(--red)' : 'var(--line)'}`,
          }}
        >
          <b>Patient Identity Check:</b>{' '}
          {identityCheck.status === 'MATCH'
            ? 'Patient details in documents match policy subscriber.'
            : identityCheck.status === 'MISMATCH'
            ? 'Patient in documents does NOT match the policy subscriber (check Name / DOB).'
            : 'Patient identity could not be verified in documents.'}
        </div>
      )}

      {/* Outcome pills */}
      <div className="row" style={{ gap: '6px', flexWrap: 'wrap' }}>
        <Pill tone={bannerTone}>{bannerText}</Pill>
        {softCount > 0 && hardCount > 0 && <Pill tone="amb">{softCount} to fix</Pill>}
        <Pill tone="teal">{passedCount} passed</Pill>
      </div>

      {/* Findings List */}
      {findings.length === 0 ? (
        <div className="muted small" style={{ padding: '8px 0' }}>
          No rule violations found against current payer guidelines.
        </div>
      ) : (
        findings.map((f, idx) => {
          const isHard = f.gap_type === 'hard' || f.action === 'reject'
          const tone = isHard ? 'red' : f.action === 'require_preauth' ? 'plum' : 'amb'
          const chipLabel = isHard
            ? 'BLOCKS CLAIM'
            : f.action === 'require_preauth'
            ? 'NEEDS PRE-AUTH'
            : 'SHOULD FIX'

          return (
            <div
              key={f.finding_id || idx}
              style={{
                border: '1px solid var(--line)',
                borderRadius: '8px',
                padding: '10px 12px',
                display: 'flex',
                gap: '10px',
                alignItems: 'flex-start',
                background: 'var(--panel)',
              }}
            >
              <Chip tone={tone}>{chipLabel}</Chip>
              <div style={{ display: 'grid', gap: '3px', minWidth: 0, flex: 1 }}>
                <b style={{ fontSize: '14.5px' }}>{f.rule_key || f.reason_code || 'Guideline Gap'}</b>
                <span className="small muted">{f.description}</span>
                {f.remediation && (
                  <span className="small" style={{ color: 'var(--accent)', fontWeight: 500 }}>
                    Fix: {f.remediation}
                  </span>
                )}
                {f.page_number && (
                  <span
                    className="mono small muted"
                    style={{ fontSize: '11.5px', color: 'var(--teal)' }}
                  >
                    source: Page {f.page_number}
                  </span>
                )}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}

