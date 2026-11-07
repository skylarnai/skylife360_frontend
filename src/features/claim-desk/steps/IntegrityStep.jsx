import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { EmptyStep } from '@/components/common/EmptyStep'
import { Button, ErrorBox, Note } from '@/components/ui'
import { useIntake } from '@/features/gaps/hooks/useIntake'
import { integrityApi } from '@/features/integrity/api/integrityApi'
import { IntegrityCheckRow } from '@/features/integrity/components/IntegrityCheckRow'
import { IntegritySummaryPills } from '@/features/integrity/components/IntegritySummaryPills'
import { useIntegrityRun } from '@/features/integrity/hooks/useIntegrityRun'
import { PERMISSIONS } from '@/constants/permissions'
import { useActivity } from '@/hooks/useActivity'
import { usePermission } from '@/hooks/usePermission'
import { useUiStore } from '@/store/uiStore'
import { useClaimDesk } from '../hooks/useClaimDesk'

export function IntegrityStep() {
  const { claimId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { log } = useActivity()
  const apiPanel = useUiStore((state) => state.apiPanel)

  const { desk, updateDesk } = useClaimDesk(claimId)

  // Retrieve batch, intake, or explicit integrity run ID from URL or desk store
  const batchId = searchParams.get('batch') || desk.batchId
  const intakeId = searchParams.get('intake') || desk.intakeId

  const intakeQuery = useIntake(intakeId)

  // Use integrity_run_id from intake if present, or fallback to desk store
  const runId = intakeQuery.data?.integrity_run_id || desk.integrityRunId
  const packetId = intakeQuery.data?.packet_id || desk.packetId

  // GET /integrity/runs/{id} and POST /integrity/check need integrity:view (403 INSUFFICIENT_PERMISSIONS).
  const canViewIntegrity = usePermission(PERMISSIONS.INTEGRITY_VIEW)
  const integrityRunQuery = useIntegrityRun(canViewIntegrity ? runId : null)
  const [runningManual, setRunningManual] = useState(false)
  const [manualError, setManualError] = useState('')

  // Sync integrity state into desk when run finishes
  useEffect(() => {
    if (integrityRunQuery.data?.status === 'COMPLETED') {
      updateDesk({ integrityRun: true })
    }
  }, [integrityRunQuery.data?.status, updateDesk])

  // Fallback manual run (only needed if intake didn't auto-queue a run)
  const handleRunIntegrity = async () => {
    if (!packetId) return
    setRunningManual(true)
    setManualError('')
    try {
      const res = await integrityApi.requestCheck(packetId)
      if (res?.run_id) {
        updateDesk({ integrityRunId: res.run_id })
        log(`started integrity check run ${res.run_id}`)
      }
    } catch (err) {
      setManualError(err?.message || 'Failed to start integrity check.')
    } finally {
      setRunningManual(false)
    }
  }

  const goToApprove = () => {
    const params = new URLSearchParams()
    if (batchId) params.set('batch', batchId)
    if (intakeId) params.set('intake', intakeId)
    const qs = params.toString() ? `?${params.toString()}` : ''
    navigate(`/claims/${claimId}/approve${qs}`)
  }

  // Guard: Step 4 must have a packet built first
  const hasPacket = Boolean(packetId || desk.packetId || desk.gapsRun)

  if (!hasPacket && !runId) {
    return (
      <>
        <div className="between">
          <h2 style={{ fontSize: '18px' }}>Integrity check</h2>
          <span className="small muted">Runs on the claim packet</span>
        </div>
        <Note tone="plum">
          Visible to admins only. Doctors and staff only see that a claim is on hold.
        </Note>
        <EmptyStep
          message="Build the claim packet first."
          actionText="Go to step 3."
          to={`/claims/${claimId}/gaps${batchId ? `?batch=${encodeURIComponent(batchId)}` : ''}`}
        />
      </>
    )
  }

  if (!canViewIntegrity) {
    return (
      <>
        <div className="between">
          <h2 style={{ fontSize: '18px' }}>Integrity check</h2>
          <span className="small muted">Runs on the claim packet</span>
        </div>
        <Note tone="plum">
          Integrity results are shown only to users with the integrity:view permission. The check
          still runs on the packet, and the reviewer sees its result before approving.
        </Note>
        <div className="row">
          <Button variant="pri" onClick={goToApprove}>
            Next: approve & submit →
          </Button>
        </div>
      </>
    )
  }

  const runData = integrityRunQuery.data
  const isBusy = runData?.status === 'QUEUED' || runData?.status === 'PROCESSING'
  const isCompleted = runData?.status === 'COMPLETED'
  const isFailedSystem = runData?.status === 'FAILED_SYSTEM'
  const checks = runData?.checks || []
  const degradedCount = runData?.degraded_checks ?? 0

  return (
    <>
      <div className="between">
        <h2 style={{ fontSize: '18px' }}>Integrity check</h2>
        <span className="small muted">Runs on the claim packet</span>
      </div>

      <Note tone="plum">
        Visible to admins only. Doctors and staff only see that a claim is on hold.
      </Note>

      {/* When no run has been started yet (e.g. manual fallback) */}
      {!runId && (
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
          <div className="muted small">
            Looks for duplicate or resubmitted claims, pre-existing conditions, edited documents,
            invalid IDs, and abnormal billing.
          </div>
          {manualError && <ErrorBox message={manualError} />}
          <div className="row">
            <Button variant="acc" loading={runningManual} onClick={handleRunIntegrity}>
              Run integrity check
            </Button>
          </div>
        </div>
      )}

      {/* Polling / Processing State */}
      {runId && (isBusy || (integrityRunQuery.isLoading && !runData)) && (
        <div
          style={{
            border: '1px solid var(--line)',
            borderRadius: '8px',
            padding: '24px',
            background: 'var(--panel)',
            textAlign: 'center',
            display: 'grid',
            gap: '8px',
            placeItems: 'center',
          }}
        >
          <div className="row" style={{ gap: '10px' }}>
            <span className="spinner" />
            <b style={{ fontSize: '15px' }}>Checking claim integrity…</b>
          </div>
          <span className="small muted">
            Inspecting file forensics, duplicate claim registries, and billing tariffs. Usually
            takes under a minute.
          </span>
        </div>
      )}

      {/* System Error State */}
      {isFailedSystem && (
        <ErrorBox
          message="The integrity check could not finish due to a system error."
          onRetry={handleRunIntegrity}
          retryLabel="Run again"
        />
      )}

      {/* Query Error */}
      {integrityRunQuery.isError && (
        <ErrorBox
          message={integrityRunQuery.error?.message || 'Could not fetch integrity check results.'}
          onRetry={() => integrityRunQuery.refetch()}
        />
      )}

      {/* Completed State */}
      {isCompleted && (
        <>
          <IntegritySummaryPills checks={checks} />

          {degradedCount > 0 && (
            <Note>
              {degradedCount} {degradedCount === 1 ? 'check' : 'checks'} ran with limited data.
            </Note>
          )}

          <div style={{ display: 'grid', gap: '8px' }}>
            {checks.length === 0 ? (
              <div className="small muted" style={{ padding: '8px 0' }}>
                No anomaly checks were generated for this packet.
              </div>
            ) : (
              checks.map((check, idx) => (
                <IntegrityCheckRow
                  key={check.check_type || idx}
                  check={check}
                  apiPanel={apiPanel}
                />
              ))
            )}
          </div>

          <div className="row" style={{ marginTop: '8px' }}>
            <Button variant="pri" onClick={goToApprove}>
              Next: approve & submit →
            </Button>
          </div>
        </>
      )}
    </>
  )
}
