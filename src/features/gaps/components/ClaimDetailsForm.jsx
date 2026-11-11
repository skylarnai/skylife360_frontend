import { isMaskedValue } from '@/utils/phi'
import { Button, Note } from '@/components/ui'

/**
 * Claim Details Form (GAP-02)
 * Pre-fills from claim data and /claims/intake/extract preview,
 * collects mandatory subscriber, provider, payer, and patient consent.
 */
export function ClaimDetailsForm({
  formData,
  onChange,
  onSubmit,
  loading = false,
  extracting = false,
  docSummary,
  providerOptional = false,
}) {
  const handleChange = (field, value) => {
    onChange?.({ ...formData, [field]: value })
  }

  const handleNestedChange = (parent, field, value) => {
    onChange?.({
      ...formData,
      [parent]: {
        ...(formData[parent] || {}),
        [field]: value,
      },
    })
  }

  // Prefilled from a masked claim (the user has no phi:unmasked): these must be replaced, never sent.
  const maskedSubscriber = ['member_id', 'first_name', 'last_name'].some((field) =>
    isMaskedValue(formData.subscriber?.[field]),
  )

  const canSubmit =
    !loading &&
    !maskedSubscriber &&
    !extracting &&
    Boolean(formData.consent?.processing) &&
    Boolean(formData.payer_id) &&
    Boolean(formData.subscriber?.member_id) &&
    Boolean(formData.subscriber?.first_name) &&
    Boolean(formData.subscriber?.last_name) &&
    (providerOptional ||
      (Boolean(formData.provider?.provider_id) && Boolean(formData.provider?.name))) &&
    docSummary?.isReady

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (canSubmit) onSubmit?.()
      }}
      style={{
        border: '1px solid var(--line)',
        borderRadius: '8px',
        padding: '16px',
        background: 'var(--panel)',
        display: 'grid',
        gap: '14px',
      }}
    >
      <div className="between" style={{ alignItems: 'baseline' }}>
        <b style={{ fontSize: '15px' }}>Claim & Intake Details</b>
        <span className="small muted">
          {extracting ? 'Extracting document facts…' : 'Pre-filled from claim record and documents'}
        </span>
      </div>

      {docSummary && (
        <div style={{ fontSize: '13.5px', color: docSummary.isReady ? 'var(--ok)' : 'var(--amb)' }}>
          📄{' '}
          <b>
            {docSummary.eligibleCount} of {docSummary.totalCount}
          </b>{' '}
          documents ready (indexed & verified).
          {!docSummary.isReady &&
            ' Wait for documents to finish reading or upload documents in Step 1.'}
          {docSummary.hasTooMany && ' Up to 20 documents allowed per check.'}
        </div>
      )}

      {/* Grid of form inputs */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '12px',
        }}
      >
        <div className="field">
          <label className="small muted">Payer ID *</label>
          <input
            type="text"
            className="input"
            required
            value={formData.payer_id || ''}
            onChange={(e) => handleChange('payer_id', e.target.value)}
          />
        </div>

        <div className="field">
          <label className="small muted">Payer Name</label>
          <input
            type="text"
            className="input"
            value={formData.payer_name || ''}
            onChange={(e) => handleChange('payer_name', e.target.value)}
          />
        </div>

        <div className="field">
          <label className="small muted">Service Date</label>
          <input
            type="date"
            className="input"
            value={formData.service_date || ''}
            onChange={(e) => handleChange('service_date', e.target.value)}
          />
        </div>

        <div className="field">
          <label className="small muted" htmlFor="cg-primary-dx">
            Primary diagnosis (ICD-10)
          </label>
          <input
            id="cg-primary-dx"
            type="text"
            className="input"
            placeholder="Only if the documents' code is not read"
            maxLength={32}
            value={formData.primary_diagnosis_code || ''}
            onChange={(e) => handleChange('primary_diagnosis_code', e.target.value.toUpperCase())}
          />
          <span className="small muted">
            Copy it from the discharge summary. It replaces the codes read from the documents.
          </span>
        </div>

        <div className="field">
          <label className="small muted">Policy / Member ID *</label>
          <input
            type="text"
            className="input"
            required
            value={formData.subscriber?.member_id || ''}
            onChange={(e) => handleNestedChange('subscriber', 'member_id', e.target.value)}
          />
        </div>

        <div className="field">
          <label className="small muted">First Name *</label>
          <input
            type="text"
            className="input"
            required
            value={formData.subscriber?.first_name || ''}
            onChange={(e) => handleNestedChange('subscriber', 'first_name', e.target.value)}
          />
        </div>

        <div className="field">
          <label className="small muted">Last Name *</label>
          <input
            type="text"
            className="input"
            required
            value={formData.subscriber?.last_name || ''}
            onChange={(e) => handleNestedChange('subscriber', 'last_name', e.target.value)}
          />
        </div>

        <div className="field">
          <label className="small muted">Date of Birth</label>
          <input
            type="date"
            className="input"
            value={formData.subscriber?.birth_date || ''}
            onChange={(e) => handleNestedChange('subscriber', 'birth_date', e.target.value)}
          />
          <span className="small muted">Checked against the age in the documents</span>
        </div>

        <div className="field">
          <label className="small muted">Gender</label>
          <select
            className="input"
            value={formData.subscriber?.gender || ''}
            onChange={(e) => handleNestedChange('subscriber', 'gender', e.target.value)}
          >
            <option value="">Not given</option>
            <option value="F">Female (F)</option>
            <option value="M">Male (M)</option>
            <option value="U">Unknown / Other (U)</option>
          </select>
        </div>

        <div className="field">
          <label className="small muted">Provider ID {providerOptional ? '' : '*'}</label>
          <input
            type="text"
            className="input"
            required={!providerOptional}
            value={formData.provider?.provider_id || ''}
            onChange={(e) => handleNestedChange('provider', 'provider_id', e.target.value)}
          />
        </div>

        <div className="field">
          <label className="small muted">
            Provider / Hospital Name {providerOptional ? '(hospital default)' : '*'}
          </label>
          <input
            type="text"
            className="input"
            value={formData.provider?.name || ''}
            onChange={(e) => handleNestedChange('provider', 'name', e.target.value)}
          />
        </div>
      </div>

      {/* Consent Section */}
      <div
        style={{
          borderTop: '1px solid var(--line)',
          paddingTop: '12px',
          display: 'grid',
          gap: '8px',
        }}
      >
        <label className="row" style={{ gap: '8px', cursor: 'pointer', fontSize: '13.5px' }}>
          <input
            type="checkbox"
            checked={Boolean(formData.consent?.processing)}
            onChange={(e) => handleNestedChange('consent', 'processing', e.target.checked)}
          />
          <span>
            <b>Patient Consent Confirmed *</b> (Patient consented to automated claim processing)
          </span>
        </label>
        <label
          className="row"
          style={{ gap: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--muted)' }}
        >
          <input
            type="checkbox"
            checked={Boolean(formData.consent?.training)}
            onChange={(e) => handleNestedChange('consent', 'training', e.target.checked)}
          />
          <span>Consent for de-identified training / model improvement use</span>
        </label>
      </div>

      {!formData.consent?.processing && (
        <Note>Confirming patient consent is mandatory before running the rule engine.</Note>
      )}
      {maskedSubscriber && (
        <Note>
          The policy / member ID or name is masked for your role. Enter the real values, or ask an
          admin to run the gap check.
        </Note>
      )}

      <div className="row" style={{ marginTop: '4px' }}>
        <Button variant="acc" type="submit" loading={loading} disabled={!canSubmit}>
          Run gap check
        </Button>
      </div>
    </form>
  )
}
