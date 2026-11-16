import { useState } from 'react'
import { Button, ErrorBox, Kv, Note, Pill, Select, TextInput } from '@/components/ui'
import { formatMoney } from '@/utils/formatters'
import {
  CLAIM_TYPES,
  DECISION_TONE,
  documentLabel,
  PAYER_DOCUMENT_TYPES,
  RISK_BAND_TONE,
} from '../constants'
import { useMockScenarios, usePrecheck } from '../hooks/usePayerStatus'

const panelStyle = {
  border: '1px solid var(--line)',
  borderRadius: '8px',
  padding: '16px',
  background: 'var(--panel)',
  display: 'grid',
  gap: '12px',
}

/** The POST /claims/submissions body (empty optional fields left out). */
function buildBody(packetId, form) {
  const body = { packet_id: packetId, claim_type: form.claim_type }
  if (form.admission_date) body.admission_date = form.admission_date
  if (form.discharge_date) body.discharge_date = form.discharge_date
  if (form.preauth_ref.trim()) body.preauth_ref = form.preauth_ref.trim()
  if (form.documents.length) body.documents = form.documents
  if (form.mock_scenario && form.mock_scenario !== 'auto') body.mock_scenario = form.mock_scenario
  return body
}

function PrecheckResult({ result }) {
  if (!result) return null
  if (result.valid === false) {
    return (
      <ErrorBox
        message={`The payer would refuse this claim at intake: ${(result.errors || [])
          .map((e) => `${e.field}: ${e.message}`)
          .join('; ')}`}
      />
    )
  }
  const issues = result.issues || []
  return (
    <div style={{ ...panelStyle, background: 'var(--surface)' }}>
      <div className="between" style={{ alignItems: 'center' }}>
        <b>Payer pre-check</b>
        <div className="row" style={{ gap: '6px' }}>
          {result.expected_decision && (
            <Pill tone={DECISION_TONE[result.expected_decision] || 'grey'}>
              Likely: {result.expected_decision}
            </Pill>
          )}
          {result.model?.band && (
            <Pill tone={RISK_BAND_TONE[result.model.band] || 'grey'}>{result.model.band} risk</Pill>
          )}
        </div>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '6px 16px',
        }}
      >
        <Kv label="Claimed" value={formatMoney(result.claimed_amount)} />
        <Kv label="Expected payable" value={formatMoney(result.expected_payable)} />
        <Kv label="Policy on file" value={result.policy_known ? 'Yes' : 'Not found'} />
      </div>
      {issues.length > 0 ? (
        <div style={{ display: 'grid', gap: '4px' }}>
          {issues.map((line, idx) => (
            <div key={`${line.code}-${idx}`} className="row small" style={{ gap: '8px' }}>
              <Pill tone={line.outcome === 'REJECT' ? 'red' : 'amb'}>{line.code}</Pill>
              <span style={{ flex: 1 }}>{line.message}</span>
              {Number(line.deduction) > 0 && <b>−{formatMoney(line.deduction)}</b>}
            </div>
          ))}
        </div>
      ) : (
        <div className="small muted">No issues found by the payer’s rules.</div>
      )}
      {(result.documents_to_add || []).length > 0 && (
        <Note>Add before sending: {result.documents_to_add.map(documentLabel).join(', ')}</Note>
      )}
      {result.model?.synthetic && (
        <div className="small muted">Risk band from a model trained on simulated claims.</div>
      )}
    </div>
  )
}

/**
 * Manual submission to the payer: claim type, stay dates, pre-auth reference, extra documents,
 * an admin-only mock scenario, and a pre-check (nothing sent) before POST /claims/submissions.
 */
export function SubmitToPayerForm({
  packetId,
  payerName = 'the payer',
  defaultAdmissionDate = '',
  isAdmin = false,
  onSubmit,
  isSubmitting = false,
  submitError = null,
}) {
  const [form, setForm] = useState({
    claim_type: 'FINAL',
    admission_date: defaultAdmissionDate || '',
    discharge_date: '',
    preauth_ref: '',
    documents: [],
    mock_scenario: 'auto',
  })
  const precheck = usePrecheck()
  const scenarios = useMockScenarios({ enabled: isAdmin })

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))
  const toggleDoc = (code) =>
    setForm((prev) => ({
      ...prev,
      documents: prev.documents.includes(code)
        ? prev.documents.filter((d) => d !== code)
        : [...prev.documents, code],
    }))

  const needsDischarge = form.claim_type === 'FINAL' || form.claim_type === 'REIMBURSEMENT'
  const body = buildBody(packetId, form)

  return (
    <div style={panelStyle}>
      <b style={{ fontSize: '15px' }}>Send to {payerName}</b>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '10px',
        }}
      >
        <Select
          label="Claim type"
          value={form.claim_type}
          onChange={set('claim_type')}
          options={CLAIM_TYPES}
        />
        <TextInput
          label="Admission date"
          type="date"
          value={form.admission_date}
          onChange={set('admission_date')}
        />
        <TextInput
          label={`Discharge date${needsDischarge ? '' : ' (optional)'}`}
          type="date"
          value={form.discharge_date}
          onChange={set('discharge_date')}
          hint={
            needsDischarge ? 'The payer needs it unless the documents show the stay' : undefined
          }
        />
        {form.claim_type !== 'PREAUTH' && (
          <TextInput
            label="Pre-auth reference"
            placeholder="From the payer’s pre-authorisation"
            maxLength={40}
            value={form.preauth_ref}
            onChange={set('preauth_ref')}
          />
        )}
        {isAdmin && (scenarios.data || []).length > 0 && (
          <Select
            label="Mock scenario (admin, testing only)"
            value={form.mock_scenario}
            onChange={set('mock_scenario')}
            options={scenarios.data.map((s) => ({
              value: s.name,
              label: `${s.name} · ${s.description}`,
            }))}
          />
        )}
      </div>

      <div style={{ display: 'grid', gap: '6px' }}>
        <span className="small muted">Extra documents sent with the claim</span>
        <div className="row" style={{ flexWrap: 'wrap', gap: '6px' }}>
          {PAYER_DOCUMENT_TYPES.map((code) => (
            <label
              key={code}
              className="small"
              style={{
                display: 'inline-flex',
                gap: '4px',
                alignItems: 'center',
                padding: '4px 8px',
                border: '1px solid var(--line)',
                borderRadius: '6px',
              }}
            >
              <input
                type="checkbox"
                checked={form.documents.includes(code)}
                onChange={() => toggleDoc(code)}
              />
              {documentLabel(code)}
            </label>
          ))}
        </div>
      </div>

      <div className="row" style={{ gap: '8px' }}>
        <Button
          loading={precheck.isPending}
          disabled={!packetId}
          onClick={() => precheck.mutate(body)}
        >
          Pre-check with {payerName}
        </Button>
        <Button
          variant="acc"
          loading={isSubmitting}
          disabled={!packetId}
          onClick={() => onSubmit?.(body)}
        >
          Submit to {payerName}
        </Button>
      </div>

      {precheck.error && <ErrorBox message={precheck.error.message || 'Pre-check failed.'} />}
      <PrecheckResult result={precheck.data} />
      {submitError && <ErrorBox message={submitError.message || 'Submission failed.'} />}
    </div>
  )
}
