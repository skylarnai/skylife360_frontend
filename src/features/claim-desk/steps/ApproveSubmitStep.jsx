import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { env } from '@/config/env'
import { EmptyStep } from '@/components/common/EmptyStep'
import { Button, Chip, ErrorBox, Pill } from '@/components/ui'
import { reviewsApi } from '@/features/review/api/reviewsApi'
import { submissionsApi } from '@/features/review/api/submissionsApi'
import { useActivity } from '@/hooks/useActivity'
import { useSession } from '@/hooks/useSession'
import { useUiStore } from '@/store/uiStore'
import { PROTOTYPE_GAPS } from '../constants'
import { useClaimDesk } from '../hooks/useClaimDesk'

const DECISIONS = [
  ['APPROVED', 'Approve'],
  ['FALSE_POSITIVE', 'Approve · the integrity warning is a false alarm'],
  ['REJECTED', 'Send back to the hospital'],
]

function ChecklistDot({ tone, symbol, text }) {
  return (
    <div className="row" style={{ gap: '8px', fontSize: '14px', flexWrap: 'nowrap' }}>
      <Chip
        tone={tone}
        style={{
          borderRadius: '50%',
          width: '20px',
          height: '20px',
          padding: 0,
          display: 'inline-grid',
          placeItems: 'center',
        }}
      >
        {symbol}
      </Chip>
      <span>{text}</span>
    </div>
  )
}

export function ApproveSubmitStep() {
  const { claimId = 'SUV-261028-01' } = useParams()
  const { user } = useSession()
  const { log } = useActivity()
  const apiPanel = useUiStore((state) => state.apiPanel)
  const { desk, updateDesk } = useClaimDesk(claimId)
  const [submittingDecision, setSubmittingDecision] = useState(false)
  const [submittingClaim, setSubmittingClaim] = useState(false)

  const gapNames = PROTOTYPE_GAPS.filter((g) => g[1] === 'amb').map((g) => g[2].toLowerCase())
  const reviewerName = user?.name || 'A. Rao'

  const handleConfirmDecision = async () => {
    const trimmedNote = (desk.note || '').trim()
    if (!desk.pick) {
      updateDesk({ err: 'Choose a decision.' })
      return
    }
    if (desk.pick !== 'APPROVED' && trimmedNote.length < 10) {
      updateDesk({ err: 'Add a short reason (at least 10 characters).' })
      return
    }

    setSubmittingDecision(true)
    try {
      await reviewsApi.adjudicate(desk.reviewTaskId, {
        version: 1,
        decision: desk.pick,
        rationale: trimmedNote,
        false_positive_checks: desk.pick === 'FALSE_POSITIVE' ? ['TAMPERING'] : [],
        gap_report_recipients: desk.pick === 'REJECTED' ? ['Dr. S. Menon'] : [],
      })
    } catch {
      // Fallback to prototype decision state when backend is offline
    } finally {
      setSubmittingDecision(false)
      updateDesk({
        err: '',
        note: trimmedNote,
        decision: desk.pick,
      })
      log(
        desk.pick === 'REJECTED'
          ? 'sent the claim back to the hospital'
          : `approved the claim${
              desk.pick === 'FALSE_POSITIVE'
                ? ' (integrity warning marked false alarm)'
                : ''
            }`
      )
    }
  }

  const handleSubmitClaim = async () => {
    setSubmittingClaim(true)
    try {
      await submissionsApi.createSubmission(desk.packetId)
    } catch {
      // Fallback to prototype submission state when backend is offline
    } finally {
      setSubmittingClaim(false)
      updateDesk({ submitted: true })
      log('submitted the claim to TPA SYN-3')
    }
  }

  return (
    <>
      <div className="between">
        <h2 style={{ fontSize: '18px' }}>Approve and submit</h2>
        <span className="small muted">
          A person signs off every claim before it goes to the payer
        </span>
      </div>

      {!desk.integrityRun ? (
        <EmptyStep
          message="Run the integrity check first."
          actionText="Go to step 5."
          to={`/claims/${claimId}/integrity`}
        />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '12px',
          }}
        >
          <div
            style={{
              border: '1px solid var(--line)',
              borderRadius: '8px',
              padding: '12px',
              display: 'grid',
              gap: '8px',
              alignContent: 'start',
            }}
          >
            <b style={{ font: '700 14.5px var(--f-display)' }}>Before you approve</b>
            <ChecklistDot tone="ok" symbol="✓" text="6 of 6 documents read" />
            <ChecklistDot
              tone={gapNames.length ? 'amb' : 'ok'}
              symbol={gapNames.length ? '!' : '✓'}
              text={
                gapNames.length
                  ? `${gapNames.length} to fix: ${gapNames.join(', ')}`
                  : 'No gaps left to fix'
              }
            />
            <ChecklistDot tone="ok" symbol="✓" text="Nothing blocks this claim" />
            <ChecklistDot
              tone="amb"
              symbol="!"
              text="Integrity: 1 warning (document tampering)"
            />
          </div>

          <div
            style={{
              border: '1px solid var(--line)',
              borderRadius: '8px',
              padding: '12px',
              display: 'grid',
              gap: '10px',
              alignContent: 'start',
            }}
          >
            {!desk.decision ? (
              <>
                <div className="field">
                  Decision
                  <div style={{ display: 'grid', gap: '6px' }}>
                    {DECISIONS.map(([value, label]) => (
                      <label
                        key={value}
                        className="row"
                        style={{
                          gap: '8px',
                          color: 'var(--fg)',
                          fontSize: '14px',
                          flexWrap: 'nowrap',
                        }}
                      >
                        <input
                          type="radio"
                          name="dec"
                          value={value}
                          checked={desk.pick === value}
                          onChange={(e) => updateDesk({ pick: e.target.value })}
                          style={{ width: 'auto', minHeight: 'auto' }}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>

                <label className="field" htmlFor="rationale">
                  Reason (required when you override a warning or send the claim back)
                  <textarea
                    id="rationale"
                    rows={3}
                    placeholder="e.g. Image was rotated by the records team; histopathology to follow, insurer accepts it after discharge."
                    value={desk.note}
                    onChange={(e) => updateDesk({ note: e.target.value })}
                  />
                </label>

                {desk.err ? <ErrorBox message={desk.err} /> : null}

                <Button
                  variant="pri"
                  loading={submittingDecision}
                  onClick={handleConfirmDecision}
                >
                  Confirm decision
                </Button>
              </>
            ) : desk.decision === 'REJECTED' ? (
              <>
                <Pill
                  tone="red"
                  style={{ borderRadius: '6px', padding: '9px 11px', fontSize: '14px' }}
                >
                  Sent back by {reviewerName}. A gap report was shared with Dr. S. Menon.
                </Pill>
                <div className="small muted">Reason: {desk.note}</div>
                <Button
                  onClick={() => updateDesk({ decision: null, pick: null, err: '' })}
                >
                  Reopen review
                </Button>
              </>
            ) : (
              <>
                <Pill
                  tone="ok"
                  style={{ borderRadius: '6px', padding: '9px 11px', fontSize: '14px' }}
                >
                  Approved by {reviewerName}
                  {desk.decision === 'FALSE_POSITIVE'
                    ? ' · integrity warning marked as a false alarm'
                    : ''}
                  .
                </Pill>
                {desk.note && <div className="small muted">Reason: {desk.note}</div>}

                {!desk.submitted ? (
                  <Button
                    variant="acc"
                    loading={submittingClaim}
                    onClick={handleSubmitClaim}
                  >
                    Submit to TPA SYN-3
                  </Button>
                ) : (
                  <>
                    <div className="flow">
                      {[
                        ['QUEUED', 'Queued'],
                        ['DISPATCHING', 'Sending'],
                        ['SUBMITTED', 'Received by TPA SYN-3'],
                      ].map(([code, label], idx) => (
                        <div key={code} className={idx < 2 ? 'on' : 'cur'}>
                          <b style={{ fontSize: '13px' }}>{label}</b>
                          {env.showApiPanel && apiPanel && (
                            <span className="mono small muted">{code}</span>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="small muted">
                      Payer reference SYN3-CLM-88214. If the payer rejects it, it comes back here
                      with their reasons.
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
