import { env } from '@/config/env'
import { Chip } from '@/components/ui/Chip'
import { Lbl } from '@/components/ui/Lbl'

const LIVE_ACCOUNTS = [
  { email: 'superadmin@hosp.org', label: 'SUPER ADMIN', tone: 'ok', disabled: false },
  { email: 'admin@hosp.org', label: 'ADMIN (MFA)', tone: 'teal', disabled: false },
  {
    email: 'doctor@hosp.org',
    label: 'DOCTOR',
    tone: 'grey',
    disabled: true,
    note: 'Disabled during Admin API integration',
  },
]

const MOCK_ACCOUNTS = [
  { email: 'a.rao@suvidha.demo', label: 'ADMIN', tone: 'teal', disabled: false },
  {
    email: 's.menon@suvidha.demo',
    label: 'DOCTOR',
    tone: 'grey',
    disabled: true,
    note: 'Disabled during Admin API integration',
  },
  {
    email: 'k.iyer@suvidha.demo',
    label: 'RECORDS STAFF',
    tone: 'grey',
    disabled: true,
    note: 'Disabled during Admin API integration',
  },
]

export function DemoAccounts({ onSelectAccount, disabled = false }) {
  if (!env.showApiPanel) {
    return null
  }

  const accounts = env.authMock ? MOCK_ACCOUNTS : LIVE_ACCOUNTS

  return (
    <div className="ldemo">
      <div className="top">
        <Lbl>Demo accounts</Lbl>
        <span>
          {env.authMock
            ? 'Tap one to fill it in · password demo1234'
            : 'Tap one to fill it in · password SecurePass123!'}
        </span>
      </div>
      {accounts.map((acc) => {
        const isDisabled = disabled || acc.disabled
        return (
          <button
            key={acc.email}
            type="button"
            className="dacc disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isDisabled}
            title={acc.note || undefined}
            onClick={() => {
              if (!isDisabled) {
                onSelectAccount?.(acc.email)
              }
            }}
          >
            <code>{acc.email}</code>
            <Chip tone={acc.tone}>{acc.label}</Chip>
          </button>
        )
      })}
    </div>
  )
}
