import { useState } from 'react'
import { Button, CardPad, ErrorBox, Select, TextInput } from '@/components/ui'
import { uploadErrorMessage } from '@/features/ingestion/utils/fileResultView'
import { useCreateClaim } from '../hooks/useCreateClaim'

const EMPTY = {
  claim_id: '',
  user_id: '',
  patient_name: '',
  patient_sex: '',
  patient_age: '',
  procedure_name: '',
  scheme: '',
  payer_name: '',
  tpa_name: '',
  policy_number: '',
  treating_doctor: '',
  estimated_amount: '',
}

const SEX_OPTIONS = [
  { value: '', label: '—' },
  { value: 'F', label: 'Female' },
  { value: 'M', label: 'Male' },
  { value: 'U', label: 'Other / unknown' },
]

/** POST /claims: the patient is granted to this hospital automatically. */
export function NewClaimForm({ onCreated, onCancel }) {
  const [form, setForm] = useState(EMPTY)
  const createMutation = useCreateClaim()

  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!form.user_id.trim()) return
    const payload = Object.fromEntries(
      Object.entries(form)
        .map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value])
        .filter(([, value]) => value !== ''),
    )
    if (payload.patient_age) payload.patient_age = Number(payload.patient_age)
    if (payload.estimated_amount) payload.estimated_amount = Number(payload.estimated_amount)
    createMutation.mutate(payload, { onSuccess: (claim) => onCreated?.(claim) })
  }

  return (
    <CardPad>
      <form onSubmit={handleSubmit} className="ncf">
        <div className="ncf-head">
          <h3>New claim</h3>
          <span className="small muted">Only the patient ID is required</span>
        </div>

        <fieldset className="ncf-section">
          <legend className="lbl">Patient</legend>
          <div className="ncf-grid">
            <TextInput
              label="Patient ID *"
              value={form.user_id}
              onChange={set('user_id')}
              required
              autoFocus
            />
            <TextInput
              label="Claim ID"
              placeholder="Auto-generated if empty"
              value={form.claim_id}
              onChange={set('claim_id')}
            />
            <TextInput
              label="Patient name"
              value={form.patient_name}
              onChange={set('patient_name')}
            />
            <Select
              label="Sex"
              options={SEX_OPTIONS}
              value={form.patient_sex}
              onChange={set('patient_sex')}
            />
            <TextInput
              label="Age"
              type="number"
              min="0"
              max="150"
              value={form.patient_age}
              onChange={set('patient_age')}
            />
          </div>
        </fieldset>

        <fieldset className="ncf-section">
          <legend className="lbl">Treatment</legend>
          <div className="ncf-grid">
            <TextInput
              label="Procedure"
              value={form.procedure_name}
              onChange={set('procedure_name')}
            />
            <TextInput
              label="Treating doctor"
              value={form.treating_doctor}
              onChange={set('treating_doctor')}
            />
            <TextInput
              label="Estimated amount (₹)"
              type="number"
              min="0"
              step="1"
              value={form.estimated_amount}
              onChange={set('estimated_amount')}
            />
          </div>
        </fieldset>

        <fieldset className="ncf-section">
          <legend className="lbl">Coverage</legend>
          <div className="ncf-grid">
            <TextInput
              label="Scheme"
              placeholder="e.g. Private cashless, PM-JAY"
              value={form.scheme}
              onChange={set('scheme')}
            />
            <TextInput label="Payer" value={form.payer_name} onChange={set('payer_name')} />
            <TextInput label="TPA" value={form.tpa_name} onChange={set('tpa_name')} />
            <TextInput
              label="Policy number"
              value={form.policy_number}
              onChange={set('policy_number')}
            />
          </div>
        </fieldset>

        {createMutation.isError && <ErrorBox message={uploadErrorMessage(createMutation.error)} />}

        <div className="ncf-actions">
          <Button type="button" onClick={onCancel} disabled={createMutation.isPending}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="acc"
            loading={createMutation.isPending}
            disabled={!form.user_id.trim()}
          >
            Create claim
          </Button>
        </div>
      </form>
    </CardPad>
  )
}
