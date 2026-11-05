import { Select } from '@/components/ui'
import { patientLabel } from '../utils'

export function PatientPicker({
  patients = [],
  value,
  onChange,
  includeAll = false,
  label = 'Patient',
  className,
  disabled,
}) {
  const options = [
    ...(includeAll ? [{ value: 'all', label: 'All patients' }] : []),
    ...patients.map((p) => ({ value: p.user_id, label: patientLabel(p) })),
  ]

  return (
    <Select
      label={label}
      className={className}
      value={value || (includeAll ? 'all' : '')}
      onChange={(e) => onChange(e.target.value)}
      options={options}
      disabled={disabled || options.length === 0}
    />
  )
}
