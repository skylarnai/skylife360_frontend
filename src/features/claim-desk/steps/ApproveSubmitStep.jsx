import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useParams, useSearchParams } from 'react-router-dom'
import { EmptyStep } from '@/components/common/EmptyStep'
import { Button, ErrorBox, Note, Pill } from '@/components/ui'
import { intakeQueryKey, useIntake } from '@/features/gaps/hooks/useIntake'
import { useBatch } from '@/features/ingestion/hooks/useBatch'
import { useIntegrityRun } from '@/features/integrity/hooks/useIntegrityRun'
import { AdjudicationForm } from '@/features/review/components/AdjudicationForm'
import { IntegrityClearanceForm } from '@/features/review/components/IntegrityClearanceForm'
import { PreApprovalChecklist } from '@/features/review/components/PreApprovalChecklist'
import { SubmissionTracker } from '@/features/review/components/SubmissionTracker'
import { reviewTaskQueryKey, useReviewTask } from '@/features/review/hooks/useReviewTask'
import { useSubmission } from '@/features/review/hooks/useSubmission'
import { REVIEW_STAGE_INTEGRITY } from '@/features/review/utils/reviewLabels'
import { PERMISSIONS } from '@/constants/permissions'
import { useActivity } from '@/hooks/useActivity'
import { usePermission } from '@/hooks/usePermission'
import { useSession } from '@/hooks/useSession'
import { useClaimDesk } from '../hooks/useClaimDesk'

const panelStyle = {
  border: '1px solid var(--line)',
  borderRadius: '8px',
  padding: '16px',
  background: 'var(--panel)',
  display: 'grid',
  gap: '10px',
}

export function ApproveSubmitStep() {
  const { claimId } = useParams()
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const { user } = useSession()
  const { log } = useActivity()
  const { claim, desk, updateDesk, latestPacketId } = useClaimDesk(claimId)

  // The backend enforces these (403 INSUFFICIENT_PERMISSIONS); the UI only hides what would fail.
  const canApprove = usePermission(PERMISSIONS.CLAIMS_APPROVE)
  const canClearIntegrity = usePermission(PERMISSIONS.INTEGRITY_CLEAR)
  const canSubmit = usePermission(PERMISSIONS.CLAIMS_SUBMIT)
  const canViewIntegrity = usePermission(PERMISSIONS.INTEGRITY_VIEW)

  // Retrieve batch and intake IDs from URL searchParams or desk state
  const batchId = searchParams.get('batch') || desk.batchId
  const intakeId = searchParams.get('intake') || desk.intakeId

  // Live queries across the previous steps
  const intakeQuery = useIntake(intakeId)
  const batchQuery = useBatch(batchId)

  const integrityRunId = intakeQuery.data?.integrity_run_id || desk.integrityRunId
  // This browser's run first; otherwise the claim's latest packet (e.g. a second reviewer's window).
  const packetId = intakeQuery.data?.packet_id || desk.packetId || latestPacketId
  // Integrity runs need integrity:view; without it the task alone drives this step.
  const integrityRunQuery = useIntegrityRun(canViewIntegrity ? integrityRunId : null)
  const integrityStatus = integrityRunQuery.data?.status

  // The intake's pipeline view says where the claim is now (review task, submission).
  const pipeline = intakeQuery.data?.pipeline || {}
  const [openedTaskId, setOpenedTaskId] = useState(null)
  const reviewTaskId = pipeline.review?.task_id || openedTaskId || desk.reviewTaskId || null

  // Hand-off returned by the decision (review_auto_handoff): submission queued or gap report sent.
  // After a reload it comes back on the task (GET /reviews/{id} -> handoff).
  const [localHandoff, setLocalHandoff] = useState(null)
  const [localSubmissionId, setLocalSubmissionId] = useState(null)

  const {
    task,
    isLoading: isLoadingTask,
    error: taskError,
    openTaskAsync,
    isOpeningTask,
    openTaskError,
    adjudicateAsync,
    isAdjudicating,
    adjudicateError,
    clearIntegrityAsync,
    isClearingIntegrity,
    clearIntegrityError,
  } = useReviewTask(reviewTaskId)

  const handoff = localHandoff || task?.handoff || null
  const submissionId =
    localSubmissionId ||
    handoff?.submission_id ||
    pipeline.submission?.submission_id ||
    desk.submissionId ||
    null
  // Latest gap report for the packet (GET /claims/intake/{id} -> pipeline.gap_report), kept across reloads.
  const gapReport = pipeline.gap_report || null

  const {
    submission,
    createSubmissionAsync,
    isSubmitting,
    submitError,
    requeue,
    isRequeueing,
    requeueError,
  } = useSubmission(submissionId)

  // No review task yet: POST /reviews { packet_id } returns the existing one (200) or opens it (201).
  const openAttempted = useRef(false)
  useEffect(() => {
    // With an intake, wait for it (its pipeline view may already name the task); without one, open by packet.
    if (!packetId || reviewTaskId || (intakeId && !intakeQuery.isSuccess) || openAttempted.current)
      return
    openAttempted.current = true
    openTaskAsync(packetId)
      .then((data) => {
        if (data?.task_id) {
          setOpenedTaskId(data.task_id)
          updateDesk({ reviewTaskId: data.task_id })
        }
      })
      .catch(() => {
        // Shown via openTaskError
      })
  }, [packetId, reviewTaskId, intakeId, intakeQuery.isSuccess, openTaskAsync, updateDesk])

  // A finished integrity run changes the task (version, blockers, stage): reload it.
  useEffect(() => {
    if (reviewTaskId && (integrityStatus === 'COMPLETED' || integrityStatus === 'FAILED_SYSTEM')) {
      queryClient.invalidateQueries({ queryKey: reviewTaskQueryKey(reviewTaskId) })
    }
  }, [integrityStatus, reviewTaskId, queryClient])

  // Document counts come from the batch; everything the backend enforces comes from the task.
  const files = batchQuery.data?.files || []
  const verifiedDocCount = files.filter(
    (f) => f.status === 'INGESTED' && !f.is_archive && f.extraction?.status === 'INDEXED',
  ).length
  const totalDocCount = files.filter((f) => !f.is_archive).length

  const blockers = task?.blockers || []
  const flags = task?.flags || []
  const integrityChecks = task?.integrity_checks || []
  const minChars = task?.rationale_min_chars || 10
  const integrityPending = task?.stage === REVIEW_STAGE_INTEGRITY

  const reviewerName = user?.name || 'the reviewer'
  const payerName =
    claim?.payer_name || submission?.payer_code || handoff?.payer_code || 'the payer'

  const refreshIntake = () => {
    if (intakeId) queryClient.invalidateQueries({ queryKey: intakeQueryKey(intakeId) })
  }

  const handleClearIntegrity = async (rationale) => {
    try {
      await clearIntegrityAsync({
        taskId: reviewTaskId,
        payload: { version: task.version, rationale },
      })
      log('cleared the integrity flags for approval')
    } catch {
      // Shown via clearIntegrityError
    }
  }

  const handleConfirmDecision = async ({
    decision,
    rationale,
    false_positive_checks,
    gap_report_recipients,
  }) => {
    try {
      const res = await adjudicateAsync({
        taskId: reviewTaskId,
        payload: {
          version: task.version,
          decision,
          rationale,
          false_positive_checks,
          gap_report_recipients,
        },
      })
      const nextHandoff = res?.handoff || null
      setLocalHandoff(nextHandoff)
      updateDesk({
        decision,
        note: rationale || '',
        ...(nextHandoff?.submission_id
          ? { submitted: true, submissionId: nextHandoff.submission_id }
          : {}),
      })
      refreshIntake()
      log(
        decision === 'FALSE_POSITIVE'
          ? 'approved the claim (integrity warning marked false alarm)'
          : decision === 'APPROVED'
            ? 'approved the claim'
            : 'sent the claim back to the hospital',
      )
      if (nextHandoff?.action === 'submitted') log(`queued the claim for ${payerName}`)
    } catch {
      // Shown via adjudicateError
    }
  }

  // Manual fallback only: the decision already queues the submission unless the hand-off failed,
  // was skipped, or auto hand-off is off on the backend.
  const handleSubmitToPayer = async () => {
    if (!packetId) return
    try {
      const res = await createSubmissionAsync(packetId)
      if (res?.submission_id) {
        setLocalSubmissionId(res.submission_id)
        updateDesk({ submitted: true, submissionId: res.submission_id })
        refreshIntake()
        log(`submitted the claim to ${payerName}`)
      }
    } catch {
      // Shown via submitError
    }
  }

  // Guard: Must complete prior steps
  const hasIntegrityCompleted =
    desk.integrityRun || integrityRunQuery.data?.status === 'COMPLETED' || Boolean(packetId)

  const header = (
    <div className="between">
      <h2 style={{ fontSize: '18px' }}>Approve and submit</h2>
      <span className="small muted">
        A person signs off every claim before it goes to the payer
      </span>
    </div>
  )

  if (!hasIntegrityCompleted && !intakeId) {
    return (
      <>
        {header}
        <EmptyStep
          message="Run the integrity check first."
          actionText="Go to step 4."
          to={`/claims/${claimId}/integrity${batchId ? `?batch=${encodeURIComponent(batchId)}` : ''}`}
        />
      </>
    )
  }

  if (!task) {
    const loadError = openTaskError || taskError
    return (
      <>
        {header}
        {loadError ? (
          <ErrorBox message={loadError.message || 'Could not load the review task.'} />
        ) : (
          <div className="small muted">
            {isOpeningTask || isLoadingTask || intakeQuery.isLoading
              ? 'Loading the review…'
              : 'Waiting for the claim packet…'}
          </div>
        )}
      </>
    )
  }

  const currentDecision = desk.decision || task.decision || handoff?.decision || null
  const isApproved = currentDecision === 'APPROVED' || currentDecision === 'FALSE_POSITIVE'
  // Manual submit only when the auto hand-off failed or was skipped, or never ran (auto hand-off off).
  const handoffNeedsManualSubmit =
    !handoff || handoff.action === 'failed' || handoff.action === 'skipped'
  const showSubmitButton = isApproved && !submissionId && handoffNeedsManualSubmit && canSubmit
  const submitBlockedByPermission =
    isApproved && !submissionId && handoffNeedsManualSubmit && !canSubmit

  return (
    <>
      {header}

      {!currentDecision ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '16px',
            alignItems: 'start',
          }}
        >
          <PreApprovalChecklist
            verifiedDocCount={verifiedDocCount}
            totalDocCount={totalDocCount}
            softGapCount={task.soft_gaps || 0}
            blockers={blockers}
            flags={flags}
            integrityChecks={integrityChecks}
            canViewIntegrity={canViewIntegrity}
          />

          <div style={{ display: 'grid', gap: '16px' }}>
            {integrityPending && canClearIntegrity && (
              <IntegrityClearanceForm
                integrityFlag={task.integrity_flag}
                integrityChecks={integrityChecks}
                minChars={minChars}
                onSubmit={handleClearIntegrity}
                loading={isClearingIntegrity}
                error={clearIntegrityError}
              />
            )}

            {integrityPending && !canClearIntegrity && (
              <Note tone="plum">
                The integrity flags must be cleared by someone with the integrity:clear permission
                before this claim can be approved.
              </Note>
            )}

            {canApprove ? (
              <AdjudicationForm
                // Remount when the stage changes so the default choice follows the new state.
                key={`${task.task_id}:${task.stage}`}
                blockers={blockers}
                flags={flags}
                integrityChecks={integrityChecks}
                minChars={minChars}
                integrityPending={integrityPending}
                onSubmit={handleConfirmDecision}
                loading={isAdjudicating}
                error={adjudicateError}
              />
            ) : (
              <Note>
                You can see this review, but only someone with the claims:approve permission can
                decide it.
              </Note>
            )}
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          <div style={panelStyle}>
            <div className="row" style={{ gap: '10px', alignItems: 'center' }}>
              <Pill tone={currentDecision === 'REJECTED' ? 'red' : 'ok'}>
                {currentDecision === 'FALSE_POSITIVE'
                  ? `Approved by ${reviewerName} · integrity warning marked as a false alarm`
                  : currentDecision === 'APPROVED'
                    ? `Approved by ${reviewerName}`
                    : `Sent back by ${reviewerName}`}
              </Pill>
            </div>

            {desk.note && (
              <div className="small muted" style={{ fontSize: '13.5px' }}>
                <b>Reason:</b> {desk.note}
              </div>
            )}

            {handoff?.action === 'gap_report' ? (
              <Note tone="live">
                A gap report was sent to the hospital ({handoff.recipients ?? 1}{' '}
                {handoff.recipients === 1 ? 'recipient' : 'recipients'}).
              </Note>
            ) : (
              currentDecision === 'REJECTED' &&
              gapReport && (
                <Note tone="live">
                  A gap report was sent to the hospital (status: {gapReport.status}).
                </Note>
              )
            )}
            {handoff?.action === 'skipped' && (
              <Note>
                Hand-off skipped: {handoff.reason}
                {handoff.message ? ` (${handoff.message})` : ''}
              </Note>
            )}
            {handoff?.action === 'failed' && (
              <ErrorBox
                message={`The decision is saved, but the hand-off failed (${handoff.error_code}): ${handoff.message || ''}`}
              />
            )}

            {showSubmitButton && (
              <div className="row" style={{ marginTop: '6px' }}>
                <Button variant="acc" loading={isSubmitting} onClick={handleSubmitToPayer}>
                  Submit to {payerName}
                </Button>
              </div>
            )}

            {submitBlockedByPermission && (
              <Note>
                The claim is approved. Someone with the claims:submit permission must send it to{' '}
                {payerName}.
              </Note>
            )}

            {submitError && <ErrorBox message={submitError.message || 'Submission failed.'} />}
          </div>

          {submissionId && (
            <SubmissionTracker
              submission={submission}
              payerName={payerName}
              onRequeue={canSubmit ? (reason) => requeue({ submissionId, reason }) : undefined}
              isRequeueing={isRequeueing}
              requeueError={requeueError}
            />
          )}

          {currentDecision === 'REJECTED' && (
            <div className="row">
              <Button
                onClick={() => {
                  updateDesk({ decision: null, note: '' })
                }}
              >
                ↺ Reopen review
              </Button>
            </div>
          )}
        </div>
      )}
    </>
  )
}
