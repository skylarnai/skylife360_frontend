import { Link, Navigate, useParams } from 'react-router-dom'
import { ActivityRail } from '@/components/common/ActivityRail'
import { ApiRail } from '@/components/dev/ApiRail'
import { CardPad, ErrorBox, Lbl, Pill } from '@/components/ui'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { formatMoney } from '@/utils/formatters'
import {
  DESK_STEP_APIS,
  DESK_STEPS,
  getStepSnippet,
  SUGGESTED_QUESTIONS,
} from '../constants'
import { useClaimDesk } from '../hooks/useClaimDesk'
import { ApproveSubmitStep } from '../steps/ApproveSubmitStep'
import { AskStep } from '../steps/AskStep'
import { CheckGapsStep } from '../steps/CheckGapsStep'
import { IntegrityStep } from '../steps/IntegrityStep'
import { ReadDocumentsStep } from '../steps/ReadDocumentsStep'
import { UploadStep } from '../steps/UploadStep'

const STEP_COMPONENTS = {
  upload: UploadStep,
  read: ReadDocumentsStep,
  ask: AskStep,
  gaps: CheckGapsStep,
  integrity: IntegrityStep,
  approve: ApproveSubmitStep,
}

export function ClaimDeskLayout() {
  const { claimId, step = 'upload' } = useParams()
  const activeStepObj = DESK_STEPS.find((s) => s.key === step)
  useDocumentTitle(activeStepObj ? `${activeStepObj.title} · ${claimId}` : claimId)

  const { claim, isLoadingClaim, claimError, refetchClaim, desk, gapsLeft, statusInfo } =
    useClaimDesk(claimId)

  if (!activeStepObj) {
    // A disabled step (e.g. Ask) sends the user on to the next one instead of back to the start.
    const fallback = step === 'ask' ? 'gaps' : 'upload'
    return <Navigate to={`/claims/${claimId}/${fallback}`} replace />
  }

  const StepComponent = STEP_COMPONENTS[activeStepObj.key] || UploadStep
  const currentQuestionText =
    SUGGESTED_QUESTIONS[desk.q]?.text || SUGGESTED_QUESTIONS[0].text

  if (claimError) {
    const message =
      claimError.status === 404
        ? `Claim ${claimId} doesn't exist. Open it from the claims list or create it there.`
        : claimError.status === 403
          ? "You don't have access to this claim's patient."
          : claimError.message || 'The claim could not be loaded.'
    return (
      <CardPad className="stack">
        <ErrorBox
          message={message}
          onRetry={[403, 404].includes(claimError.status) ? undefined : () => refetchClaim()}
        />
        <Link to="/claims">← Back to claims</Link>
      </CardPad>
    )
  }

  const patient = claim?.patient || {}
  const patientBits = [patient.name, patient.user_id || claim?.user_id, patient.sex, patient.age]
    .filter((v) => v !== null && v !== undefined && v !== '')
    .join(' · ')
  const payerText = claim?.payer_name
    ? `${claim.payer_name}${claim.tpa_name ? ` via ${claim.tpa_name}` : ''}`
    : null
  const facts = [
    ['Patient', patientBits],
    ['Payer', payerText],
    ['Policy', claim?.policy_number],
    ['Treating doctor', claim?.treating_doctor],
  ].filter(([, value]) => value)

  return (
    <>
      <CardPad className="between" style={{ alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0, flex: '1 1 520px' }}>
          <div className="mono" style={{ fontSize: '12px', color: 'var(--accent)' }}>
            {claimId}
            {claim?.scheme ? ` · ${claim.scheme}` : ''}
          </div>
          <h1 style={{ fontSize: '22px', margin: '2px 0 6px' }}>
            {isLoadingClaim ? 'Loading claim…' : claim?.procedure_name || 'Procedure not set'}
          </h1>
          <div className="row muted" style={{ fontSize: '13.5px', gap: '4px 18px' }}>
            {facts.map(([label, value]) => (
              <span key={label}>
                {label} <b style={{ color: 'var(--fg)', fontWeight: 600 }}>{value}</b>
              </span>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gap: '8px', justifyItems: 'end' }}>
          <div style={{ font: '800 20px var(--f-display)', textAlign: 'right' }}>
            {claim ? formatMoney(claim.estimated_amount ?? 0) : '—'}
            <Lbl style={{ display: 'block', fontSize: '11px' }}>Estimated claim value</Lbl>
          </div>
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <Pill tone={statusInfo.tone}>{statusInfo.text}</Pill>
            {desk.gapsRun && gapsLeft > 0 && !desk.submitted && (
              <Pill tone="amb">{gapsLeft} to fix</Pill>
            )}
          </div>
        </div>
      </CardPad>

      <nav className="stages" aria-label="Claim steps" style={{ margin: '12px 0' }}>
        {DESK_STEPS.map((stg, position) => {
          const isCurrent = stg.key === activeStepObj.key
          const isDone =
            statusInfo.reached[stg.index] && stg.index < activeStepObj.index
          return (
            <Link
              key={stg.key}
              to={`/claims/${claimId}/${stg.key}`}
              className={`stg${isDone ? ' done' : ''}`}
              aria-current={isCurrent ? 'step' : undefined}
            >
              <b>
                {position + 1} · {stg.title}
              </b>
              <span className="sub">{stg.sub}</span>
            </Link>
          )
        })}
      </nav>

      <div className="cols">
        <section className="card main pad stack" aria-live="polite">
          <StepComponent />
        </section>
        <aside className="rail">
          <ApiRail
            title={activeStepObj.title.toLowerCase()}
            apis={DESK_STEP_APIS[activeStepObj.key] || []}
            snippet={getStepSnippet(activeStepObj.key, currentQuestionText)}
          />
          <ActivityRail />
        </aside>
      </div>
    </>
  )
}
