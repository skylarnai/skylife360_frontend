import { useState } from 'react'
import { Button, ErrorBox, Kv, Note, Pill, TextArea } from '@/components/ui'
import { formatMoney, formatTableDate } from '@/utils/formatters'
import { documentLabel, getPayerStatusTone, PAYER_DOCUMENT_TYPES } from '../constants'
import { usePayerStatus } from '../hooks/usePayerStatus'

const panelStyle = {
  border: '1px solid var(--line)',
  borderRadius: '8px',
  padding: '16px',
  background: 'var(--panel)',
  display: 'grid',
  gap: '12px',
}

const LINE_TONE = { REJECT: 'red', QUERY: 'amb', DEDUCT: 'amb' }

function DocumentPicker({ value, onChange, suggested = [], disabled }) {
  const options = [...new Set([...suggested, ...PAYER_DOCUMENT_TYPES])]
  const toggle = (code) =>
    onChange(value.includes(code) ? value.filter((d) => d !== code) : [...value, code])
  return (
    <div className="row" style={{ flexWrap: 'wrap', gap: '6px' }}>
      {options.map((code) => (
        <label
          key={code}
          className="small"
          style={{
            display: 'inline-flex',
            gap: '4px',
            alignItems: 'center',
            padding: '4px 8px',
            border: `1px solid ${suggested.includes(code) ? 'var(--amb, #b7791f)' : 'var(--line)'}`,
            borderRadius: '6px',
          }}
        >
          <input
            type="checkbox"
            checked={value.includes(code)}
            disabled={disabled}
            onChange={() => toggle(code)}
          />
          {documentLabel(code)}
        </label>
      ))}
    </div>
  )
}

/** One hospital action at the payer: a short form, then the call. */
function ActionForm({ kind, payerStatus, mutation, onDone }) {
  const requested = (payerStatus.required_actions || []).flatMap((a) => a.documents || [])
  const [documents, setDocuments] = useState(kind === 'respond' ? requested : [])
  const [text, setText] = useState('')

  const config = {
    respond: {
      title: 'Answer the payer’s query',
      textLabel: 'Note to the payer (optional if you send the documents)',
      button: 'Send answer',
      ready: documents.length > 0 || text.trim(),
      body: () => ({ documents, note: text.trim() || undefined }),
    },
    appeal: {
      title: 'Appeal the rejection',
      textLabel: 'Why should the payer reconsider? *',
      button: 'Send appeal',
      ready: Boolean(text.trim()),
      body: () => ({ notes: text.trim(), documents }),
    },
    withdraw: {
      title: 'Withdraw the claim',
      textLabel: 'Reason *',
      button: 'Withdraw claim',
      ready: Boolean(text.trim()),
      body: () => text.trim(),
    },
  }[kind]

  const submit = async () => {
    try {
      await mutation.mutateAsync(config.body())
      onDone?.()
    } catch {
      // Shown below
    }
  }

  return (
    <div style={{ ...panelStyle, background: 'var(--surface)' }}>
      <b>{config.title}</b>
      {kind !== 'withdraw' && (
        <>
          <span className="small muted">
            Documents provided
            {kind === 'respond' && requested.length ? ' (asked for: highlighted)' : ''}
          </span>
          <DocumentPicker
            value={documents}
            onChange={setDocuments}
            suggested={kind === 'respond' ? requested : []}
            disabled={mutation.isPending}
          />
        </>
      )}
      <TextArea
        label={config.textLabel}
        rows={2}
        maxLength={2000}
        value={text}
        disabled={mutation.isPending}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="row" style={{ gap: '8px' }}>
        <Button
          size="sm"
          variant={kind === 'withdraw' ? 'warn' : 'acc'}
          loading={mutation.isPending}
          disabled={!config.ready}
          onClick={submit}
        >
          {config.button}
        </Button>
        <Button size="sm" onClick={onDone} disabled={mutation.isPending}>
          Cancel
        </Button>
      </div>
      {mutation.error && <ErrorBox message={mutation.error.message} />}
    </div>
  )
}

/**
 * The claim at the payer after submission (GET .../payer-status): status, decision lines,
 * the payer's query, settlement, and the actions the payer allows (query answer, appeal, withdraw).
 */
export function PayerStatusPanel({
  submissionId,
  payerName = 'the payer',
  canAct = false,
  onChanged,
}) {
  const {
    payerStatus,
    isLoading,
    awaitingAcknowledgement,
    error,
    refresh,
    respond,
    appeal,
    withdraw,
  } = usePayerStatus(submissionId)
  const [openAction, setOpenAction] = useState(null)

  if (!submissionId) return null

  if (isLoading || awaitingAcknowledgement) {
    return (
      <div style={panelStyle}>
        <b style={{ fontSize: '15px' }}>At {payerName}</b>
        <div className="small muted">Waiting for {payerName} to acknowledge the claim…</div>
      </div>
    )
  }
  if (error) return <ErrorBox message={error.message || 'Could not load the payer status.'} />
  if (!payerStatus) return null

  const s = payerStatus
  const actions = s.actions || {}
  const lines = s.decision_lines || []
  const requiredActions = s.required_actions || []
  const mutations = { respond, appeal, withdraw }
  const done = () => {
    setOpenAction(null)
    onChanged?.()
  }

  return (
    <div style={panelStyle}>
      {s.is_mock && (
        <Note tone="plum">
          <b>Mock insurer, not a real claim.</b> {payerName} is simulated for testing and demos;
          nothing is sent to a real insurer.
        </Note>
      )}

      <div className="between" style={{ alignItems: 'center' }}>
        <b style={{ fontSize: '15px' }}>At {payerName}</b>
        <div className="row" style={{ gap: '8px', alignItems: 'center' }}>
          <Pill tone={getPayerStatusTone(s.status)}>{s.status_label || s.status}</Pill>
          <Button
            size="sm"
            loading={refresh.isPending}
            onClick={() => refresh.mutate()}
            title="Ask the payer for the latest status"
          >
            ↻ Refresh
          </Button>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: '6px 16px',
        }}
      >
        <Kv label="Payer reference" value={s.payer_claim_reference || '—'} />
        <Kv label="Claim type" value={s.claim_type || '—'} />
        <Kv label="Claimed" value={formatMoney(s.claimed_amount)} />
        <Kv
          label="Approved"
          value={
            s.approved_amount !== null && s.approved_amount !== undefined
              ? formatMoney(s.approved_amount)
              : '—'
          }
        />
        {s.expected_by && !s.is_final && (
          <Kv label="Decision expected by" value={formatTableDate(s.expected_by)} />
        )}
        {s.decided_at && <Kv label="Decided" value={formatTableDate(s.decided_at)} />}
      </div>

      {lines.length > 0 && (
        <div style={{ display: 'grid', gap: '6px' }}>
          <span className="small muted">The payer’s reasons</span>
          {lines.map((line, idx) => (
            <div
              key={`${line.code}-${idx}`}
              className="row small"
              style={{ gap: '8px', alignItems: 'baseline' }}
            >
              <Pill tone={LINE_TONE[line.outcome] || 'grey'}>{line.code}</Pill>
              <span style={{ flex: 1 }}>{line.message}</span>
              {Number(line.deduction) > 0 && <b>−{formatMoney(line.deduction)}</b>}
            </div>
          ))}
        </div>
      )}

      {s.status === 'QUERY_RAISED' && requiredActions.length > 0 && (
        <Note>
          <b>The payer needs more before deciding</b>
          {s.query_due_at ? ` (answer by ${formatTableDate(s.query_due_at)})` : ''}:
          <ul style={{ margin: '6px 0 0 18px' }}>
            {requiredActions.map((a, idx) => (
              <li key={`${a.code}-${idx}`}>
                {[...(a.documents || []).map(documentLabel), ...(a.fields || [])].join(', ') ||
                  a.message ||
                  a.code}
              </li>
            ))}
          </ul>
          <div className="small muted" style={{ marginTop: '4px' }}>
            This is also a to-do in My to-dos; it closes when you answer.
          </div>
        </Note>
      )}

      {s.settlement && (
        <Note tone="live">
          Paid {formatMoney(s.settlement.paid_amount)}
          {s.settlement.paid_on ? ` on ${s.settlement.paid_on}` : ''} · UTR{' '}
          <b className="mono">{s.settlement.utr_number || '—'}</b>
        </Note>
      )}

      {s.outcome_error && (
        <div className="small muted">Outcome not recorded: {s.outcome_error}</div>
      )}
      {refresh.error && <ErrorBox message={refresh.error.message} />}

      {canAct &&
        !openAction &&
        (actions.respond_to_query || actions.appeal || actions.withdraw) && (
          <div className="row" style={{ gap: '8px' }}>
            {actions.respond_to_query && (
              <Button variant="acc" size="sm" onClick={() => setOpenAction('respond')}>
                Answer query
              </Button>
            )}
            {actions.appeal && (
              <Button variant="acc" size="sm" onClick={() => setOpenAction('appeal')}>
                Appeal
              </Button>
            )}
            {actions.withdraw && (
              <Button size="sm" onClick={() => setOpenAction('withdraw')}>
                Withdraw
              </Button>
            )}
          </div>
        )}
      {!canAct && (actions.respond_to_query || actions.appeal) && (
        <div className="small muted">
          Someone with the claims:submit permission can answer the payer or appeal.
        </div>
      )}

      {openAction && (
        <ActionForm
          key={openAction}
          kind={openAction}
          payerStatus={s}
          mutation={mutations[openAction]}
          onDone={done}
        />
      )}
    </div>
  )
}
