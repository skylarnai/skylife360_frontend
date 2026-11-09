import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { EmptyStep } from '@/components/common/EmptyStep'
import { useClaimDocuments } from '@/features/claims/hooks/useClaimDocuments'
import { Button, ErrorBox } from '@/components/ui'
import { ClaimDetailsForm } from '@/features/gaps/components/ClaimDetailsForm'
import { GapFindingList } from '@/features/gaps/components/GapFindingList'
import { PacketCard } from '@/features/gaps/components/PacketCard'
import { useGapRun } from '@/features/gaps/hooks/useGapRun'
import { useIntake } from '@/features/gaps/hooks/useIntake'
import { usePacket } from '@/features/gaps/hooks/usePacket'
import { useRunIntake } from '@/features/gaps/hooks/useRunIntake'
import { getIntakeFilesSummary } from '@/features/gaps/utils/intakeFiles'
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

  // Intake ID from ?intake= or the desk state; documents come from the claim itself
  const intakeId = searchParams.get('intake') || desk.intakeId

  const documentsQuery = useClaimDocuments(claimId)
  const intakeQuery = useIntake(intakeId)

  const gapRunId = intakeQuery.data?.gap_run_id || desk.gapRunId
  const packetId = intakeQuery.data?.packet_id || desk.packetId

  const gapRunQuery = useGapRun(gapRunId)
  const packetQuery = usePacket(packetId)
  const runIntakeMutation = useRunIntake()

  // Eligible files summary for intake
  const docSummary = getIntakeFilesSummary(documentsQuery.data?.files)

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

  // Form state. No example values: whatever is sent must have been typed or come from the claim
  // (a leftover example birth date once made every claim look like "a different patient").
  const [formData, setFormData] = useState({
    encounter_id: claimId,
    claim_id: claimId,
    user_id: '',
    payer_id: '',
    payer_name: '',
    service_date: '',
    subscriber: { member_id: '', first_name: '', last_name: '', birth_date: '', gender: '' },
    provider: { provider_id: '', name: '', id_qualifier: 'PI' },
    consent: {
      processing: true,
      training: false,
      reference: `CONSENT-${claimId || '001'}`,
    },
  })

  // Prefill from the claim once per claim (adjusting state during render, not in an effect).
  // Only empty fields are filled, so a background refetch never overwrites what the user typed.
  const [prefilledFor, setPrefilledFor] = useState(null)
  if (claim && prefilledFor !== claimId) {
    setPrefilledFor(claimId)
    // patient.name is one string ("Kavita Deshpande"): first word = first name, the rest = last name.
    const [firstName, ...rest] = String(claim.patient?.name || '')
      .trim()
      .split(/\s+/)
    const lastName = rest.join(' ')
    const keep = (current, fromClaim) => current || fromClaim || ''
    setFormData((prev) => ({
      ...prev,
      user_id: keep(prev.user_id, claim.user_id),
      payer_id: keep(prev.payer_id, claim.payer_id),
      payer_name: keep(prev.payer_name, claim.payer_name),
      service_date: keep(prev.service_date, claim.service_date),
      subscriber: {
        ...prev.subscriber,
        member_id: keep(prev.subscriber.member_id, claim.policy_number),
        first_name: keep(prev.subscriber.first_name, firstName),
        last_name: keep(prev.subscriber.last_name, lastName),
        birth_date: keep(prev.subscriber.birth_date, claim.patient?.birth_date),
        gender: keep(prev.subscriber.gender, claim.patient?.sex),
      },
      provider: {
        ...prev.provider,
        provider_id: keep(prev.provider.provider_id, claim.provider_id),
        name: keep(prev.provider.name, claim.provider_name),
      },
    }))
  }

  const handleRunGaps = () => {
    if (!docSummary.isReady) return

    // Optional fields left empty are omitted (the backend reads "" as an invalid date / gender).
    const { birth_date, gender, ...subscriber } = formData.subscriber
    const payload = {
      ...formData,
      encounter_id: claimId,
      claim_id: claimId,
      user_id: claim?.user_id || formData.user_id,
      service_date: formData.service_date || undefined,
      subscriber: {
        ...subscriber,
        ...(birth_date ? { birth_date } : {}),
        ...(gender ? { gender } : {}),
      },
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
        setEditing(false)
        log(`ran gap check: intake ${data.intake_id} created`)
      },
    })
  }

  const goToIntegrity = () => {
    const params = new URLSearchParams()
    if (intakeId || desk.intakeId) params.set('intake', intakeId || desk.intakeId)
    const qs = params.toString() ? `?${params.toString()}` : ''
    navigate(`/claims/${claimId}/integrity${qs}`)
  }

  // A previous run (in the URL or the desk state) shows its results until the user chooses to edit.
  const [editing, setEditing] = useState(false)
  const hasRun = Boolean(desk.gapsRun || intakeId)
  const showForm = !hasRun || editing

  return (
    <>
      <div className="between">
        <h2 style={{ fontSize: '18px' }}>Check gaps against payer rules</h2>
        <span className="small muted">
          {formData.payer_name ? `${formData.payer_name} rules` : 'Rules check'}
        </span>
      </div>

      {!desk.uploaded ? (
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

          {showForm ? (
            <>
              {editing && (
                <div className="small muted">
                  Re-running builds a new packet from the documents on the claim now (including
                  files the hospital uploaded after a send-back). The previous run stays in the
                  audit trail.
                </div>
              )}
              <ClaimDetailsForm
                formData={formData}
                onChange={setFormData}
                onSubmit={handleRunGaps}
                loading={runIntakeMutation.isPending}
                docSummary={docSummary}
              />
              {editing && (
                <div className="row">
                  <Button
                    onClick={() => {
                      setEditing(false)
                      runIntakeMutation.startNewRun()
                    }}
                    disabled={runIntakeMutation.isPending}
                  >
                    Cancel, keep the last results
                  </Button>
                </div>
              )}
            </>
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
                <PacketCard packet={packetQuery.data} gapRunId={gapRunId} apiPanel={apiPanel} />
              )}

              <div className="row" style={{ gap: '8px', marginTop: '12px' }}>
                <Button variant="pri" onClick={goToIntegrity}>
                  Next: integrity check →
                </Button>
                <Button
                  onClick={() => {
                    runIntakeMutation.startNewRun()
                    setEditing(true)
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
