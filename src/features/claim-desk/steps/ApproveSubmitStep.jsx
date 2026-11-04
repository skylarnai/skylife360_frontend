import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { EmptyStep } from '@/components/common/EmptyStep'
import { Button, ErrorBox, Pill } from '@/components/ui'
import { useGapRun } from '@/features/gaps/hooks/useGapRun'
import { useIntake } from '@/features/gaps/hooks/useIntake'
import { useBatch } from '@/features/ingestion/hooks/useBatch'
import { useIntegrityRun } from '@/features/integrity/hooks/useIntegrityRun'
import { AdjudicationForm } from '@/features/review/components/AdjudicationForm'
import { PreApprovalChecklist } from '@/features/review/components/PreApprovalChecklist'
import { SubmissionTracker } from '@/features/review/components/SubmissionTracker'
import { useReviewTask } from '@/features/review/hooks/useReviewTask'
import { useSubmission } from '@/features/review/hooks/useSubmission'
import { useActivity } from '@/hooks/useActivity'
import { useSession } from '@/hooks/useSession'
import { useClaimDesk } from '../hooks/useClaimDesk'

export function ApproveSubmitStep() {
  const { claimId } = useParams()
  const [searchParams] = useSearchParams()
  const { user } = useSession()
  const { log } = useActivity()
  const { claim, desk, updateDesk } = useClaimDesk(claimId)

  // Retrieve batch and intake IDs from URL searchParams or desk state
  const batchId = searchParams.get('batch') || desk.batchId
  const intakeId = searchParams.get('intake') || desk.intakeId

  // Live queries across the previous steps
  const intakeQuery = useIntake(intakeId)
  const batchQuery = useBatch(batchId)

  const gapRunId = intakeQuery.data?.gap_run_id || desk.gapRunId
  const integrityRunId = intakeQuery.data?.integrity_run_id || desk.integrityRunId
  const packetId = intakeQuery.data?.packet_id || desk.packetId

  const gapRunQuery = useGapRun(gapRunId)
  const integrityRunQuery = useIntegrityRun(integrityRunId)

  // Read task_id & submission_id from intake pipeline
  const pipeline = intakeQuery.data?.pipeline || {}
  const reviewTaskId =
    pipeline.review?.task_id || desk.reviewTaskId || (intakeQuery.data ? `tsk-${intakeId?.slice(-6)}` : null)
  const [activeSubmissionId, setActiveSubmissionId] = useState(
    pipeline.submission?.submission_id || null
  )

  const {
    task,
    isLoading: isLoadingTask,
    openTask,
    isOpeningTask,
    adjudicateAsync,
    isAdjudicating,
    adjudicateError,
  } = useReviewTask(reviewTaskId)

  const {
    submission,
    createSubmissionAsync,
    isSubmitting,
    submitError,
    requeue,
    isRequeueing,
  } = useSubmission(activeSubmissionId)

  // Auto-open review task if packet exists and task is not yet created
  useEffect(() => {
    if (packetId && !reviewTaskId && !isLoadingTask && !isOpeningTask) {
      openTask(packetId)
    }
  }, [packetId, reviewTaskId, isLoadingTask, isOpeningTask, openTask])

  // Extract checklist metrics from real step data
  const files = batchQuery.data?.files || []
  const verifiedDocCount = files.filter(
    (f) => f.status === 'INGESTED' && !f.is_archive && f.extraction?.status === 'INDEXED'
  ).length
  const totalDocCount = files.filter((f) => !f.is_archive).length

  const gapFindings = gapRunQuery.data?.findings || []
  const softGaps = gapFindings
    .filter((f) => f.gap_type === 'soft' || f.action !== 'reject')
    .map((f) => f.description || f.rule_key)
  const hardRejections =
    (gapRunQuery.data?.hard_rejections ?? 0) +
    gapFindings.filter((f) => f.gap_type === 'hard' || f.action === 'reject').length

  const checks = integrityRunQuery.data?.checks || []
  const integrityWarnings = checks.filter((c) => c.result_flag === 'SOFT_WARN')

  const reviewerName = user?.name || 'A. Rao'
  const payerName = claim?.payer_name || 'TPA SYN-3'

  // Confirm Decision handler
  const handleConfirmDecision = async ({ decision, rationale, false_positive_checks, gap_report_recipients }) => {
    try {
      await adjudicateAsync({
        taskId: reviewTaskId,
        payload: {
          version: task?.version || 1,
          decision,
          rationale,
          false_positive_checks,
          gap_report_recipients,
        },
      })
      updateDesk({ decision, note: rationale })
      log(
        decision === 'FALSE_POSITIVE'
          ? 'approved the claim (integrity warning marked false alarm)'
          : decision === 'APPROVED'
          ? 'approved the claim'
          : 'sent the claim back to the hospital'
      )
    } catch {
      // Error handled by adjudicateError
    }
  }

  // Submit to Payer handler
  const handleSubmitToPayer = async () => {
    if (!packetId) return
    try {
      const res = await createSubmissionAsync(packetId)
      if (res?.submission_id) {
        setActiveSubmissionId(res.submission_id)
        updateDesk({ submitted: true })
        log(`submitted the claim to ${payerName}`)
      }
    } catch {
      // Error handled by submitError
    }
  }

  // Guard: Must complete prior steps
  const hasIntegrityCompleted =
    desk.integrityRun || integrityRunQuery.data?.status === 'COMPLETED' || Boolean(packetId)

  if (!hasIntegrityCompleted && !intakeId) {
    return (
      <>
        <div className="between">
          <h2 style={{ fontSize: '18px' }}>Approve and submit</h2>
          <span className="small muted">
            A person signs off every claim before it goes to the payer
          </span>
        </div>
        <EmptyStep
          message="Run the integrity check first."
          actionText="Go to step 4."
          to={`/claims/${claimId}/integrity${batchId ? `?batch=${encodeURIComponent(batchId)}` : ''}`}
        />
      </>
    )
  }

  const currentDecision = desk.decision || task?.decision

  return (
    <>
      <div className="between">
        <h2 style={{ fontSize: '18px' }}>Approve and submit</h2>
        <span className="small muted">
          A person signs off every claim before it goes to the payer
        </span>
      </div>

      {/* Before decision is finalized */}
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
            softGaps={softGaps}
            hardRejections={hardRejections}
            integrityWarnings={integrityWarnings}
          />

          <AdjudicationForm
            hasBlockers={hardRejections > 0}
            integrityWarnings={integrityWarnings}
            onSubmit={handleConfirmDecision}
            loading={isAdjudicating}
            error={adjudicateError}
          />
        </div>
      ) : (
        /* After Decision has been confirmed */
        <div style={{ display: 'grid', gap: '16px' }}>
          <div
            style={{
              border: '1px solid var(--line)',
              borderRadius: '8px',
              padding: '16px',
              background: 'var(--panel)',
              display: 'grid',
              gap: '10px',
            }}
          >
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

            {currentDecision !== 'REJECTED' && !activeSubmissionId && (
              <div className="row" style={{ marginTop: '6px' }}>
                <Button
                  variant="acc"
                  loading={isSubmitting}
                  onClick={handleSubmitToPayer}
                >
                  Submit to {payerName}
                </Button>
              </div>
            )}

            {submitError && <ErrorBox message={submitError.message || 'Submission failed.'} />}
          </div>

          {/* Submission Tracker once submitted */}
          {activeSubmissionId && (
            <SubmissionTracker
              submission={submission}
              payerName={payerName}
              onRequeue={() => requeue(activeSubmissionId)}
              isRequeueing={isRequeueing}
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
