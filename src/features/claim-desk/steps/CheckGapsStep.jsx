import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { EmptyStep } from '@/components/common/EmptyStep'
import { Button, ErrorBox } from '@/components/ui'
import { ClaimDetailsForm } from '@/features/gaps/components/ClaimDetailsForm'
import { GapFindingList } from '@/features/gaps/components/GapFindingList'
import { PacketCard } from '@/features/gaps/components/PacketCard'
import { useGapRun } from '@/features/gaps/hooks/useGapRun'
import { useIntake } from '@/features/gaps/hooks/useIntake'
import { usePacket } from '@/features/gaps/hooks/usePacket'
import { useRunIntake } from '@/features/gaps/hooks/useRunIntake'
import { getIntakeFilesSummary } from '@/features/gaps/utils/intakeFiles'
import { useBatch } from '@/features/ingestion/hooks/useBatch'
import { useActivity } from '@/hooks/useActivity'
import { useUiStore } from '@/store/uiStore'
import { useClaimDesk } from '../hooks/useClaimDesk'

export function CheckGapsStep() {
  const { claimId } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { log } = useActivity()
  const apiPanel = useUiStore((state) => state.apiPanel)

  const { claim, desk, updateDesk } = useClaimDesk(claimId)

  // Batch ID & Intake ID management from query params and desk state
  const batchId = searchParams.get('batch') || desk.batchId
  const intakeId = searchParams.get('intake') || desk.intakeId

  const batchQuery = useBatch(batchId)
  const intakeQuery = useIntake(intakeId)

  const gapRunId = intakeQuery.data?.gap_run_id || desk.gapRunId
  const packetId = intakeQuery.data?.packet_id || desk.packetId
  const integrityRunId = intakeQuery.data?.integrity_run_id || desk.integrityRunId

  const gapRunQuery = useGapRun(gapRunId)
  const packetQuery = usePacket(packetId)
  const runIntakeMutation = useRunIntake()

  // Eligible files summary for intake
  const docSummary = getIntakeFilesSummary(batchQuery.data?.files)

  // Synchronize desk state when an existing intake is loaded
  useEffect(() => {
    if (intakeQuery.data) {
      updateDesk({
        gapsRun: true,
        intakeId: intakeQuery.data.intake_id,
        gapRunId: intakeQuery.data.gap_run_id,
        packetId: intakeQuery.data.packet_id,
        integrityRunId: intakeQuery.data.integrity_run_id,
      })
    }
  }, [intakeQuery.data, updateDesk])

  // Synchronize gapsCount when gap findings are fetched
  useEffect(() => {
    if (gapRunQuery.data) {
      const soft = gapRunQuery.data.soft_gaps ?? 0
      const hard = gapRunQuery.data.hard_rejections ?? 0
      updateDesk({ gapsCount: soft + hard })
    }
  }, [gapRunQuery.data, updateDesk])

  // Form state
  const [formData, setFormData] = useState({
    encounter_id: claimId,
    claim_id: claimId,
    user_id: claim?.user_id || 'SYN-P-1042',
    payer_id: claim?.payer_id || 'SYN-07',
    payer_name: claim?.payer_name || 'Insurer SYN-07',
    service_date: claim?.service_date || '2026-10-09',
    subscriber: {
      member_id: claim?.policy_number || 'POL-SYN-77120',
      first_name: claim?.patient?.first_name || 'Sunita',
      last_name: claim?.patient?.last_name || 'Menon',
      birth_date: claim?.patient?.birth_date || '1980-04-02',
      gender: claim?.patient?.sex || 'F',
    },
    provider: {
      provider_id: claim?.provider_id || 'HOSP-0042',
      name: claim?.provider_name || 'Metro Multi-Speciality Hospital',
      id_qualifier: 'PI',
    },
    consent: {
      processing: true,
      training: false,
      reference: `CONSENT-${claimId || '001'}`,
    },
  })

  // Keep form in sync when claim finishes loading
  useEffect(() => {
    if (claim) {
      setFormData((prev) => ({
        ...prev,
        user_id: claim.user_id || prev.user_id,
        payer_id: claim.payer_id || prev.payer_id,
        payer_name: claim.payer_name || prev.payer_name,
        subscriber: {
          ...prev.subscriber,
          member_id: claim.policy_number || prev.subscriber.member_id,
          gender: claim.patient?.sex || prev.subscriber.gender,
        },
      }))
    }
  }, [claim])

  const handleRunGaps = () => {
    if (!docSummary.isReady) return

    const payload = {
      ...formData,
      encounter_id: claimId,
      claim_id: claimId,
      user_id: claim?.user_id || formData.user_id,
      file_ids: docSummary.fileIds,
    }

    runIntakeMutation.runIntake(payload, {
      onSuccess: (data) => {
        setSearchParams((params) => {
          params.set('intake', data.intake_id)
          return params
        })
        updateDesk({
          gapsRun: true,
          intakeId: data.intake_id,
          gapRunId: data.gap_run_id,
          packetId: data.packet_id,
          integrityRunId: data.integrity_run_id,
        })
        log(`ran gap check: intake ${data.intake_id} created`)
      },
    })
  }

  const goToIntegrity = () => {
    const params = new URLSearchParams()
    if (batchId) params.set('batch', batchId)
    if (intakeId || desk.intakeId) params.set('intake', intakeId || desk.intakeId)
    const qs = params.toString() ? `?${params.toString()}` : ''
    navigate(`/claims/${claimId}/integrity${qs}`)
  }

  const isGapsFinished = Boolean(desk.gapsRun || intakeId)

  return (
    <>
      <div className="between">
        <h2 style={{ fontSize: '18px' }}>Check gaps against payer rules</h2>
        <span className="small muted">
          {formData.payer_name ? `${formData.payer_name} rules` : 'Rules check'}
        </span>
      </div>

      {!desk.uploaded && !batchId ? (
        <EmptyStep
          message="Nothing uploaded yet."
          actionText="Go to step 1."
          to={`/claims/${claimId}/upload`}
        />
      ) : (
        <>
          {runIntakeMutation.isError && (
            <ErrorBox
              message={runIntakeMutation.error?.message || 'Gap check could not be completed.'}
              onRetry={handleRunGaps}
              retryLabel="Try again"
            />
          )}

          {!isGapsFinished ? (
            <ClaimDetailsForm
              formData={formData}
              onChange={setFormData}
              onSubmit={handleRunGaps}
              loading={runIntakeMutation.isPending}
              docSummary={docSummary}
            />
          ) : (
            <>
              {gapRunQuery.isLoading && (
                <div className="muted small" style={{ padding: '12px 0' }}>
                  Evaluating payer rules and building gap dossier…
                </div>
              )}

              {gapRunQuery.data && (
                <GapFindingList
                  gapRun={gapRunQuery.data}
                  identityCheck={intakeQuery.data?.identity_check}
                />
              )}

              {packetQuery.data && (
                <PacketCard
                  packet={packetQuery.data}
                  gapRunId={gapRunId}
                  apiPanel={apiPanel}
                />
              )}

              <div className="row" style={{ gap: '8px', marginTop: '12px' }}>
                <Button variant="pri" onClick={goToIntegrity}>
                  Next: integrity check →
                </Button>
                <Button
                  onClick={() => {
                    updateDesk({ gapsRun: false })
                    runIntakeMutation.startNewRun()
                  }}
                >
                  ↺ Edit claim details and re-run
                </Button>
              </div>
            </>
          )}
        </>
      )}
    </>
  )
}
