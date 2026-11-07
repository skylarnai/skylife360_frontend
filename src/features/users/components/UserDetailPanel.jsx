import { useState } from 'react'
import toast from 'react-hot-toast'
import { Button, CardPad, Chip, ErrorBox, Lbl, Note, Select } from '@/components/ui'
import { usePatients } from '@/features/patients/hooks/usePatients'
import { patientLabel } from '@/features/patients/utils'
import { useActivity } from '@/hooks/useActivity'
import { useSession } from '@/hooks/useSession'
import {
  BACKEND_ROLES,
  getRoleInfo,
  PERMISSION_LABELS,
  ROLE_DEFAULT_PERMISSIONS,
  usesRoleDefaults,
} from '../constants'
import {
  useGrantPatients,
  usePatientGrants,
  useRevokePatient,
  useUpdateUser,
} from '../hooks/useUsers'

/** Patients granted to a user (UserAccessGrant). Doctors (VIEWER) see only these. */
function PatientGrants({ user }) {
  const { data: granted = [], isLoading, isError, error, refetch } = usePatientGrants(user.id)
  const { data: patientsData } = usePatients()
  const grant = useGrantPatients(user.id)
  const revoke = useRevokePatient(user.id)
  const { log } = useActivity()
  const [pick, setPick] = useState('')
  const [typed, setTyped] = useState('')

  const patients = patientsData?.patients || []
  const byId = new Map(patients.map((p) => [p.user_id, p]))
  const choices = patients.filter((p) => !granted.includes(p.user_id))

  const add = (patientId) => {
    const id = String(patientId || '').trim()
    if (!id) return
    grant.mutate([id], {
      onSuccess: () => {
        log(`granted patient ${id} to ${user.email}`)
        setPick('')
        setTyped('')
      },
    })
  }

  return (
    <div className="stack" style={{ gap: '8px' }}>
      <Lbl>Patients · {isLoading ? '…' : granted.length}</Lbl>
      {user.role === 'VIEWER' ? (
        <div className="small muted">This doctor sees only these patients.</div>
      ) : (
        <div className="small muted">
          Not needed for this role: it already sees the whole hospital.
        </div>
      )}
      {isError && <ErrorBox message={error?.message} onRetry={refetch} />}
      {granted.map((id) => (
        <div
          key={id}
          className="between"
          style={{ border: '1px solid var(--line)', borderRadius: '6px', padding: '6px 9px' }}
        >
          <span className="small">{byId.get(id) ? patientLabel(byId.get(id)) : id}</span>
          <Button
            size="sm"
            loading={revoke.isPending && revoke.variables === id}
            onClick={() =>
              revoke.mutate(id, {
                onSuccess: () => log(`removed patient ${id} from ${user.email}`),
              })
            }
          >
            Remove
          </Button>
        </div>
      ))}
      {choices.length > 0 && (
        <div className="row" style={{ gap: '6px', alignItems: 'end' }}>
          <Select
            label="Grant a patient"
            className="min-w-[200px]"
            value={pick}
            onChange={(e) => setPick(e.target.value)}
            options={[
              { value: '', label: 'Choose a patient…' },
              ...choices.map((p) => ({ value: p.user_id, label: patientLabel(p) })),
            ]}
          />
          <Button
            size="sm"
            variant="acc"
            disabled={!pick}
            loading={grant.isPending}
            onClick={() => add(pick)}
          >
            Grant
          </Button>
        </div>
      )}
      <div className="row" style={{ gap: '6px', alignItems: 'end' }}>
        <label className="field" style={{ flex: '1 1 160px' }}>
          <span>Or type a patient ID</span>
          <input
            value={typed}
            placeholder="SYN-GC-102"
            onChange={(e) => setTyped(e.target.value)}
          />
        </label>
        <Button
          size="sm"
          disabled={!typed.trim()}
          loading={grant.isPending}
          onClick={() => add(typed)}
        >
          Grant
        </Button>
      </div>
      {grant.isError && <ErrorBox message={grant.error?.message} />}
      {revoke.isError && <ErrorBox message={revoke.error?.message} />}
    </div>
  )
}

/** Custom permissions REPLACE the role defaults (backend resolve_user_permissions). */
function Permissions({ user, onSave, saving }) {
  const [perms, setPerms] = useState(user.permissions || [])
  const defaults = ROLE_DEFAULT_PERMISSIONS[user.role] || []
  const dirty =
    perms.length !== (user.permissions || []).length ||
    perms.some((p) => !(user.permissions || []).includes(p))

  const toggle = (perm) =>
    setPerms((list) => (list.includes(perm) ? list.filter((p) => p !== perm) : [...list, perm]))

  return (
    <div className="stack" style={{ gap: '8px' }}>
      <Lbl>Permissions {usesRoleDefaults(user) ? '· role defaults' : '· custom'}</Lbl>
      <div className="small muted">
        Ticking a reviewer permission (integrity, approve, submit) also gives this user the Claims
        tabs.
      </div>
      <div style={{ display: 'grid', gap: '4px' }}>
        {PERMISSION_LABELS.map(([perm, label]) => (
          <label key={perm} className="row small" style={{ gap: '8px', cursor: 'pointer' }}>
            <input type="checkbox" checked={perms.includes(perm)} onChange={() => toggle(perm)} />
            <span>
              {label} <code className="muted">{perm}</code>
            </span>
          </label>
        ))}
      </div>
      <div className="row" style={{ gap: '8px' }}>
        <Button
          size="sm"
          variant="acc"
          disabled={!dirty}
          loading={saving}
          onClick={() => onSave(perms)}
        >
          Save permissions
        </Button>
        <Button size="sm" disabled={saving} onClick={() => setPerms(defaults)}>
          Reset to role defaults
        </Button>
      </div>
    </div>
  )
}

export function UserDetailPanel({ user, onClose }) {
  const { user: me } = useSession()
  const update = useUpdateUser()
  const { log } = useActivity()
  const isSelf = me?.id === user.id || me?.email === user.email
  const role = getRoleInfo(user.role)

  const save = (payload, message) =>
    update.mutate(
      { userId: user.id, payload },
      {
        onSuccess: () => {
          log(message)
          toast.success('Saved. The user is signed out and must sign in again.')
        },
      },
    )

  return (
    <CardPad className="stack">
      <div className="between">
        <Lbl>User</Lbl>
        <Button size="sm" variant="link" onClick={onClose}>
          Close
        </Button>
      </div>
      <div>
        <b>{user.name}</b>
        <div className="mono small muted">{user.email}</div>
        <div className="row" style={{ gap: '6px', marginTop: '4px' }}>
          <Chip tone={role.tone}>{role.chip}</Chip>
          <Chip tone={user.is_active ? 'ok' : 'red'}>{user.is_active ? 'ACTIVE' : 'DISABLED'}</Chip>
          {user.mfa_enabled && <Chip tone="grey">MFA</Chip>}
        </div>
      </div>

      {isSelf && <Note>This is you. Changing your own role or access signs you out.</Note>}

      <Select
        label="Role"
        value={user.role}
        disabled={update.isPending}
        onChange={(e) =>
          save({ role: e.target.value }, `changed ${user.email} to ${e.target.value}`)
        }
        options={BACKEND_ROLES.map((r) => ({ value: r.value, label: r.label }))}
        hint={role.help}
      />

      <PatientGrants user={user} />

      <Permissions
        key={`${user.id}:${(user.permissions || []).join(',')}`}
        user={user}
        saving={update.isPending}
        onSave={(permissions) => save({ permissions }, `changed permissions of ${user.email}`)}
      />

      <div className="row">
        <Button
          size="sm"
          variant={user.is_active ? 'warn' : 'acc'}
          loading={update.isPending}
          onClick={() =>
            save(
              { is_active: !user.is_active },
              `${user.is_active ? 'disabled' : 'enabled'} ${user.email}`,
            )
          }
        >
          {user.is_active ? 'Disable user' : 'Enable user'}
        </Button>
      </div>

      {update.isError && <ErrorBox message={update.error?.message} />}
    </CardPad>
  )
}
