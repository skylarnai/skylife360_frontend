import { useState } from 'react'
import { ApiRail } from '@/components/dev/ApiRail'
import { TwoColumn } from '@/components/layout/TwoColumn'
import { Button, Chip, DataTable, ErrorBox, Kv, Note, Select, TextInput } from '@/components/ui'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { formatMoney } from '@/utils/formatters'
import {
  useConnectEndpoint,
  useCreateMockPolicy,
  useLookupMockPolicy,
  useMockPayers,
  useRunMockWorker,
  useUpsertMockPayer,
} from '../hooks/useMockPayerAdmin'

const INSURANCE_APIS = [
  ['GET', '/api/v1/mock-payer/admin/payers', 'READY', 'Mock insurers (rule profile, strictness)'],
  [
    'POST',
    '/api/v1/mock-payer/admin/payers',
    'READY',
    '{ payer_code: MOCK_*, payer_name, rule_profile, strictness }',
  ],
  [
    'POST',
    '/api/v1/mock-payer/admin/policies',
    'READY',
    'Test policy; member_ref = patient ID (no PII)',
  ],
  ['GET', '/api/v1/mock-payer/admin/policies/{policy_number}', 'READY', 'Look up a test policy'],
  [
    'POST',
    '/api/v1/mock-payer/admin/endpoints',
    'READY',
    '{ payer_code (claim’s Payer ID), mock_payer }',
  ],
  [
    'POST',
    '/api/v1/mock-payer/admin/worker/run',
    'READY',
    'Review / settle / call back what is due now',
  ],
  ['GET', '/api/v1/claims/submissions/{id}/payer-status', 'READY', 'The claim at the payer'],
  ['POST', '/api/v1/claims/submissions/precheck', 'READY', 'Payer rules on a packet, nothing sent'],
]

const RULE_PROFILES = [
  { value: 'mock_standard_v1', label: 'Standard' },
  { value: 'mock_strict_v1', label: 'Strict' },
  { value: 'mock_lenient_v1', label: 'Lenient' },
]

const PAYER_COLUMNS = [
  {
    key: 'payer_code',
    header: 'INSURER',
    render: (row) => (
      <>
        <b style={{ fontWeight: 600 }}>{row.payer_name}</b>
        <div className="mono small muted">{row.payer_code}</div>
      </>
    ),
  },
  { key: 'rule_profile', header: 'RULES', cellClassName: 'mono small' },
  { key: 'strictness', header: 'STRICTNESS', cellClassName: 'small' },
  {
    key: 'is_active',
    header: 'STATUS',
    render: (row) => (
      <Chip tone={row.is_active ? 'ok' : 'grey'}>{row.is_active ? 'ACTIVE' : 'OFF'}</Chip>
    ),
  },
]

const sectionStyle = { display: 'grid', gap: '10px' }
const gridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
  gap: '10px',
}

const today = () => new Date().toISOString().slice(0, 10)
const inOneYear = () => {
  const d = new Date()
  d.setFullYear(d.getFullYear() + 1)
  return d.toISOString().slice(0, 10)
}

function PayerForm() {
  const upsert = useUpsertMockPayer()
  const [form, setForm] = useState({
    payer_code: 'MOCK_',
    payer_name: '',
    rule_profile: 'mock_standard_v1',
    strictness: '1.00',
  })
  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))
  const submit = (e) => {
    e.preventDefault()
    upsert.mutate({
      ...form,
      payer_code: form.payer_code.trim().toUpperCase(),
      payer_name: form.payer_name.trim(),
      strictness: Number(form.strictness),
    })
  }
  return (
    <form className="card pad" style={sectionStyle} onSubmit={submit}>
      <b>Add or update an insurer</b>
      <div style={gridStyle}>
        <TextInput
          label="Insurer code *"
          value={form.payer_code}
          onChange={set('payer_code')}
          pattern="MOCK_[A-Za-z0-9_]{1,25}"
          hint="Starts with MOCK_"
          required
        />
        <TextInput label="Name *" value={form.payer_name} onChange={set('payer_name')} required />
        <Select
          label="Rules"
          value={form.rule_profile}
          onChange={set('rule_profile')}
          options={RULE_PROFILES}
        />
        <TextInput
          label="Strictness"
          type="number"
          min="0.1"
          max="3"
          step="0.05"
          value={form.strictness}
          onChange={set('strictness')}
          hint="1 = normal; higher rejects more"
        />
      </div>
      <div className="row" style={{ gap: '8px', alignItems: 'center' }}>
        <Button type="submit" variant="acc" size="sm" loading={upsert.isPending}>
          Save insurer
        </Button>
        {upsert.isSuccess && <span className="small muted">Saved {upsert.data?.payer_code}.</span>}
      </div>
      {upsert.error && <ErrorBox message={upsert.error.message} />}
    </form>
  )
}

function EndpointForm({ payers }) {
  const connect = useConnectEndpoint()
  const [form, setForm] = useState({
    payer_code: '',
    mock_payer: 'MOCK_STANDARD',
    display_name: '',
  })
  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))
  const submit = (e) => {
    e.preventDefault()
    connect.mutate({
      payer_code: form.payer_code.trim().toLowerCase(),
      mock_payer: form.mock_payer,
      ...(form.display_name.trim() ? { display_name: form.display_name.trim() } : {}),
    })
  }
  const options = payers.length
    ? payers.map((p) => ({ value: p.payer_code, label: `${p.payer_name} (${p.payer_code})` }))
    : [{ value: 'MOCK_STANDARD', label: 'MOCK_STANDARD' }]
  return (
    <form className="card pad" style={sectionStyle} onSubmit={submit}>
      <b>Route a payer to a mock insurer</b>
      <div className="small muted">
        Claims whose <b>Payer ID</b> matches go to the chosen mock insurer when submitted.
      </div>
      <div style={gridStyle}>
        <TextInput
          label="Claim Payer ID *"
          placeholder="e.g. payer-01"
          value={form.payer_code}
          onChange={set('payer_code')}
          pattern="[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}"
          required
        />
        <Select
          label="Mock insurer"
          value={form.mock_payer}
          onChange={set('mock_payer')}
          options={options}
        />
        <TextInput label="Display name" value={form.display_name} onChange={set('display_name')} />
      </div>
      <div className="row" style={{ gap: '8px', alignItems: 'center' }}>
        <Button type="submit" variant="acc" size="sm" loading={connect.isPending}>
          Connect
        </Button>
        {connect.isSuccess && (
          <span className="small muted">
            {connect.data?.payer_code} → {connect.data?.mock_payer}
          </span>
        )}
      </div>
      {connect.error && <ErrorBox message={connect.error.message} />}
    </form>
  )
}

const EMPTY_POLICY = () => ({
  payer_code: 'MOCK_STANDARD',
  policy_number: 'MOCK-POL-',
  member_ref: '',
  member_birth_date: '',
  policy_start: today(),
  policy_end: inOneYear(),
  policy_status: 'ACTIVE',
  sum_insured: '500000',
  room_rent_cap_per_day: '',
  copay_pct: '0',
})

function PolicyForm({ payers }) {
  const create = useCreateMockPolicy()
  const [form, setForm] = useState(EMPTY_POLICY)
  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))
  const submit = (e) => {
    e.preventDefault()
    const body = {
      payer_code: form.payer_code,
      policy_number: form.policy_number.trim(),
      member_ref: form.member_ref.trim(),
      policy_start: form.policy_start,
      policy_end: form.policy_end,
      policy_status: form.policy_status,
      sum_insured: form.sum_insured,
      copay_pct: form.copay_pct || '0',
      ...(form.member_birth_date ? { member_birth_date: form.member_birth_date } : {}),
      ...(form.room_rent_cap_per_day ? { room_rent_cap_per_day: form.room_rent_cap_per_day } : {}),
    }
    create.mutate(body)
  }
  const options = payers.length
    ? payers.map((p) => ({ value: p.payer_code, label: p.payer_code }))
    : [{ value: 'MOCK_STANDARD', label: 'MOCK_STANDARD' }]
  return (
    <form className="card pad" style={sectionStyle} onSubmit={submit}>
      <b>Create a test policy</b>
      <div className="small muted">
        The member is the hospital&apos;s <b>Patient ID</b>. Put the same policy number on the
        claim.
      </div>
      <div style={gridStyle}>
        <Select
          label="Insurer"
          value={form.payer_code}
          onChange={set('payer_code')}
          options={options}
        />
        <TextInput
          label="Policy number *"
          value={form.policy_number}
          onChange={set('policy_number')}
          required
        />
        <TextInput
          label="Patient ID *"
          value={form.member_ref}
          onChange={set('member_ref')}
          required
        />
        <TextInput
          label="Member date of birth"
          type="date"
          value={form.member_birth_date}
          onChange={set('member_birth_date')}
        />
        <TextInput
          label="Policy start *"
          type="date"
          value={form.policy_start}
          onChange={set('policy_start')}
          required
        />
        <TextInput
          label="Policy end *"
          type="date"
          value={form.policy_end}
          onChange={set('policy_end')}
          required
        />
        <Select
          label="Policy status"
          value={form.policy_status}
          onChange={set('policy_status')}
          options={['ACTIVE', 'GRACE', 'LAPSED', 'CANCELLED']}
        />
        <TextInput
          label="Sum insured (₹) *"
          type="number"
          min="1"
          value={form.sum_insured}
          onChange={set('sum_insured')}
          required
        />
        <TextInput
          label="Room rent cap / day (₹)"
          type="number"
          min="1"
          value={form.room_rent_cap_per_day}
          onChange={set('room_rent_cap_per_day')}
        />
        <TextInput
          label="Co-pay %"
          type="number"
          min="0"
          max="100"
          value={form.copay_pct}
          onChange={set('copay_pct')}
        />
      </div>
      <div className="row" style={{ gap: '8px', alignItems: 'center' }}>
        <Button type="submit" variant="acc" size="sm" loading={create.isPending}>
          Create policy
        </Button>
        {create.isSuccess && (
          <span className="small muted">
            Created {create.data?.policy_number} for patient {create.data?.member_ref}.
          </span>
        )}
      </div>
      {create.error && <ErrorBox message={create.error.message} />}
    </form>
  )
}

function PolicyLookup() {
  const lookup = useLookupMockPolicy()
  const [number, setNumber] = useState('')
  const p = lookup.data
  return (
    <div className="card pad" style={sectionStyle}>
      <b>Look up a policy</b>
      <form
        className="row"
        style={{ gap: '8px', alignItems: 'flex-end' }}
        onSubmit={(e) => {
          e.preventDefault()
          if (number.trim()) lookup.mutate(number.trim())
        }}
      >
        <TextInput
          aria-label="Policy number"
          placeholder="MOCK-POL-…"
          value={number}
          onChange={(e) => setNumber(e.target.value)}
        />
        <Button type="submit" size="sm" loading={lookup.isPending}>
          Find
        </Button>
      </form>
      {lookup.error && <ErrorBox message={lookup.error.message} />}
      {p && (
        <div style={{ ...gridStyle, gap: '6px 16px' }}>
          <Kv label="Insurer" value={p.payer_code} />
          <Kv label="Patient ID" value={p.member_ref} />
          <Kv label="Status" value={p.policy_status} />
          <Kv label="Valid" value={`${p.policy_start} → ${p.policy_end}`} />
          <Kv label="Sum insured" value={formatMoney(p.sum_insured)} />
          <Kv label="Used" value={formatMoney(p.sum_insured_used)} />
          <Kv label="Co-pay" value={`${Number(p.copay_pct)}%`} />
          <Kv
            label="Room rent cap"
            value={p.room_rent_cap_per_day ? formatMoney(p.room_rent_cap_per_day) : '—'}
          />
        </div>
      )}
    </div>
  )
}

/** Insurance (admin): mock insurers, test policies and payer routing for demos and testing. */
export function InsurancePage() {
  useDocumentTitle('Insurance')
  const payersQuery = useMockPayers()
  const worker = useRunMockWorker()
  const payers = payersQuery.data || []
  const disabled = payersQuery.error?.code === 'MOCK_PAYER_DISABLED'

  return (
    <TwoColumn
      main={
        <>
          <div className="between" style={{ alignItems: 'center' }}>
            <h2 style={{ fontSize: '20px' }}>Insurance</h2>
            {!disabled && (
              <Button loading={worker.isPending} onClick={() => worker.mutate()}>
                Process due payer decisions now
              </Button>
            )}
          </div>

          <Note tone="plum">
            These are <b>mock insurers</b> for testing and demos: claims routed to them are decided
            by simulated rules and never reach a real insurer. Setup: add an insurer, route your
            claim&apos;s Payer ID to it, create a policy for the patient, then submit the claim from
            the claim desk.
          </Note>

          {worker.error && <ErrorBox message={worker.error.message} />}
          {worker.isSuccess && (
            <div className="small muted">Worker cycle done: {JSON.stringify(worker.data)}</div>
          )}

          {disabled ? (
            <ErrorBox message="The mock insurer is not enabled on this backend (MOCK_PAYER_ENABLED=false, or production)." />
          ) : payersQuery.error ? (
            <ErrorBox message={payersQuery.error.message} onRetry={payersQuery.refetch} />
          ) : (
            <>
              <DataTable
                columns={PAYER_COLUMNS}
                rows={payers}
                rowKey="payer_code"
                loading={payersQuery.isLoading}
                minWidth={520}
                emptyMessage="No mock insurers yet."
              />
              <PayerForm />
              <EndpointForm payers={payers} />
              <PolicyForm payers={payers} />
              <PolicyLookup />
            </>
          )}
        </>
      }
      rail={<ApiRail title="insurance" apis={INSURANCE_APIS} />}
    />
  )
}
