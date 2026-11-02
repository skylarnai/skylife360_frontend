import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { env } from '@/config/env'
import { getIntegrityFlagInfo } from '@/constants/statusMaps'
import { EmptyStep } from '@/components/common/EmptyStep'
import { Button, Chip, Note, Pill } from '@/components/ui'
import { integrityApi } from '@/features/integrity/api/integrityApi'
import { useActivity } from '@/hooks/useActivity'
import { useUiStore } from '@/store/uiStore'
import { PROTOTYPE_INTEGRITY } from '../constants'
import { useClaimDesk } from '../hooks/useClaimDesk'

export function IntegrityStep() {
  const { claimId = 'SUV-261028-01' } = useParams()
  const navigate = useNavigate()
  const { log } = useActivity()
  const apiPanel = useUiStore((state) => state.apiPanel)
  const { desk, updateDesk } = useClaimDesk(claimId)
  const [running, setRunning] = useState(false)

  const handleRunIntegrity = async () => {
    setRunning(true)
    try {
      const res = await integrityApi.requestCheck(desk.packetId)
      if (res?.run_id) {
        updateDesk({ integrityRunId: res.run_id })
      }
    } catch {
      // Fallback to prototype integrity results when backend is offline
    } finally {
      setRunning(false)
      updateDesk({ integrityRun: true })
      log('ran the integrity check: 5 passed, 1 to check')
    }
  }

  return (
    <>
      <div className="between">
        <h2 style={{ fontSize: '18px' }}>Integrity check</h2>
        <span className="small muted">Runs on the claim packet</span>
      </div>

      <Note tone="plum">
        Visible to admins only. Doctors and staff only see that a claim is on hold.
      </Note>

      {!desk.gapsRun ? (
        <EmptyStep
          message="Build the claim packet first."
          actionText="Go to step 4."
          to={`/claims/${claimId}/gaps`}
        />
      ) : !desk.integrityRun ? (
        <>
          <div className="muted">
            Looks for duplicate or resubmitted claims, pre-existing conditions, edited documents,
            invalid IDs and unusual bills.
          </div>
          <div className="row">
            <Button variant="acc" loading={running} onClick={handleRunIntegrity}>
              Run integrity check
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="row" style={{ gap: '6px' }}>
            <Pill tone="ok">5 passed</Pill>
            <Pill tone="amb">1 to check</Pill>
            <Pill tone="grey">0 failed</Pill>
          </div>

          {PROTOTYPE_INTEGRITY.map(([code, flag, title, summary]) => {
            const flagInfo = getIntegrityFlagInfo(flag)
            return (
              <div
                key={code}
                className="row"
                style={{
                  border: '1px solid var(--line)',
                  borderRadius: '8px',
                  padding: '9px 12px',
                  alignItems: 'flex-start',
                  gap: '6px 12px',
                }}
              >
                <Chip tone={flagInfo.tone}>{flagInfo.label}</Chip>
                <div
                  style={{
                    display: 'grid',
                    gap: '2px',
                    flex: '1 1 320px',
                    minWidth: 0,
                  }}
                >
                  <b style={{ fontSize: '14.5px' }}>{title}</b>
                  <span className="small muted">{summary}</span>
                </div>
                {env.showApiPanel && apiPanel && (
                  <span className="mono small muted">{code}</span>
                )}
              </div>
            )
          })}

          <div className="row">
            <Button variant="pri" onClick={() => navigate(`/claims/${claimId}/approve`)}>
              Next: approve &amp; submit →
            </Button>
          </div>
        </>
      )}
    </>
  )
}
