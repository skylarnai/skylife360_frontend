import { Pill } from '@/components/ui'

/**
 * Summary pills aggregating checks by result_flag (INT-02).
 * e.g. "5 passed", "1 to check", "0 failed"
 */
export function IntegritySummaryPills({ checks = [] }) {
  const passedCount = checks.filter((c) => c.result_flag === 'PASS').length
  const checkCount = checks.filter((c) => c.result_flag === 'SOFT_WARN').length
  const failedCount = checks.filter((c) => c.result_flag === 'HARD_FAIL').length

  return (
    <div className="row" style={{ gap: '6px', flexWrap: 'wrap' }}>
      <Pill tone="ok">{passedCount} passed</Pill>
      <Pill tone={checkCount > 0 ? 'amb' : 'grey'}>{checkCount} to check</Pill>
      <Pill tone={failedCount > 0 ? 'red' : 'grey'}>{failedCount} failed</Pill>
    </div>
  )
}

