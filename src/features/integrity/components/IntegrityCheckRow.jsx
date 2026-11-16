import { Chip } from '@/components/ui'
import { env } from '@/config/env'
import { getIntegrityFlagInfo } from '@/constants/statusMaps'
import { getIntegrityCheckLabel } from '../utils/integrityTypes'

/**
 * Individual Integrity Check Row (INT-03).
 * Renders title, result chip, summary, and dev code tag.
 */
export function IntegrityCheckRow({ check, apiPanel = false }) {
  if (!check) return null

  const flagInfo = getIntegrityFlagInfo(check.result_flag)
  const title = getIntegrityCheckLabel(check.check_type)

  return (
    <div
      style={{
        border: '1px solid var(--line)',
        borderRadius: '8px',
        padding: '10px 14px',
        background: 'var(--panel)',
        display: 'grid',
        gap: '6px',
      }}
    >
      <div className="between" style={{ alignItems: 'center' }}>
        <div className="row" style={{ gap: '8px', alignItems: 'center' }}>
          <Chip tone={flagInfo.tone}>{flagInfo.label}</Chip>
          <b style={{ fontSize: '14.5px' }}>{title}</b>
        </div>
        {env.showApiPanel && apiPanel && (
          <span className="mono small muted" style={{ fontSize: '11.5px' }}>
            {check.check_type}
          </span>
        )}
      </div>

      <div className="small muted" style={{ lineHeight: 1.5 }}>
        {check.summary || check.details || 'Check completed successfully.'}
      </div>
    </div>
  )
}

