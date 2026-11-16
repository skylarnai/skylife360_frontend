import { useState } from 'react'
import { env } from '@/config/env'

const DEFAULT_PRESETS = [
  { id: 'HOSP-001', name: 'St. Jude Medical Center (Default)' },
  { id: 'HOSP-002', name: 'Metro General Hospital' },
]

export function TenantSelector({ tenantId, onTenantChange, disabled = false }) {
  const [isEditing, setIsEditing] = useState(false)
  const [customValue, setCustomValue] = useState(tenantId || env.defaultTenantId)

  const handleSelectPreset = (id) => {
    setCustomValue(id)
    onTenantChange(id)
    setIsEditing(false)
  }

  const handleApplyCustom = (e) => {
    e.preventDefault()
    const cleaned = customValue.trim().toUpperCase()
    if (cleaned) {
      onTenantChange(cleaned)
    }
    setIsEditing(false)
  }

  const activePreset = DEFAULT_PRESETS.find((p) => p.id === tenantId)
  const displayLabel = activePreset
    ? `${activePreset.id} · ${activePreset.name.split(' (')[0]}`
    : tenantId

  return (
    <div className="ltenant-wrap">
      {!isEditing ? (
        <div className="ltenant-summary">
          <div className="ltenant-info" title={displayLabel}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="ltenant-icon"
              aria-hidden="true"
            >
              <rect width="16" height="20" x="4" y="2" rx="2" ry="2" />
              <path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01" />
            </svg>
            <span className="ltenant-label">Hospital Tenant:</span>
            <code className="ltenant-badge">{tenantId}</code>
            {activePreset ? (
              <span className="ltenant-name">{activePreset.name.split(' (')[0]}</span>
            ) : null}
          </div>
          {!disabled && (
            <button
              type="button"
              className="ltenant-toggle"
              onClick={() => setIsEditing(true)}
              title="Switch hospital tenant"
            >
              Switch
            </button>
          )}
        </div>
      ) : (
        <form className="ltenant-form" onSubmit={handleApplyCustom}>
          <div className="ltenant-form-head">
            <span className="ltenant-form-title">Select Hospital Organization</span>
            <button
              type="button"
              className="ltenant-form-close"
              onClick={() => setIsEditing(false)}
            >
              Cancel
            </button>
          </div>

          <div className="ltenant-presets">
            {DEFAULT_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={`ltenant-preset-btn ${preset.id === tenantId ? 'active' : ''}`}
                onClick={() => handleSelectPreset(preset.id)}
              >
                <b>{preset.id}</b>
                <span>{preset.name}</span>
              </button>
            ))}
          </div>

          <div className="ltenant-custom-row">
            <input
              type="text"
              placeholder="e.g. HOSP-999"
              value={customValue}
              onChange={(e) => setCustomValue(e.target.value)}
              className="ltenant-input"
              autoFocus
            />
            <button type="submit" className="ltenant-apply-btn">
              Apply
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
