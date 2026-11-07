import { useState } from 'react'
import toast from 'react-hot-toast'
import { Button, ErrorBox, Note, Select, TextInput } from '@/components/ui'
import { useActivity } from '@/hooks/useActivity'
import { BACKEND_ROLES, getRoleInfo } from '../constants'
import { useCreateUser } from '../hooks/useUsers'

const EMPTY = { name: '', email: '', role: 'VIEWER', temporary_password: '' }

/** POST /api/v1/users. The user signs in with the temporary password (admins also get MFA). */
export function CreateUserForm({ onCancel, onCreated }) {
  const [form, setForm] = useState(EMPTY)
  const [validation, setValidation] = useState('')
  const createUser = useCreateUser()
  const { log } = useActivity()

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }))
    setValidation('')
  }

  const submit = (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim()) {
      setValidation('Name and email are required.')
      return
    }
    if (form.temporary_password.length < 8) {
      setValidation('The temporary password needs at least 8 characters.')
      return
    }
    createUser.mutate(
      { ...form, name: form.name.trim(), email: form.email.trim() },
      {
        onSuccess: (user) => {
          log(`created ${getRoleInfo(user.role).label.toLowerCase()} ${user.email}`)
          toast.success(`${user.name} can now sign in`)
          setForm(EMPTY)
          onCreated?.(user)
        },
      },
    )
  }

  const role = getRoleInfo(form.role)

  return (
    <form
      onSubmit={submit}
      className="card pad"
      style={{
        display: 'grid',
        gap: '10px',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      }}
    >
      <b className="col-span-full" style={{ fontSize: '15px' }}>
        New user
      </b>
      <TextInput
        label="Name *"
        value={form.name}
        onChange={set('name')}
        placeholder="Dr. S. Menon"
      />
      <TextInput
        label="Email *"
        type="email"
        value={form.email}
        onChange={set('email')}
        placeholder="doctor@hosp.org"
      />
      <Select
        label="Role *"
        value={form.role}
        onChange={set('role')}
        options={BACKEND_ROLES.map((r) => ({ value: r.value, label: r.label }))}
      />
      <TextInput
        label="Temporary password *"
        type="password"
        autoComplete="new-password"
        value={form.temporary_password}
        onChange={set('temporary_password')}
        hint="At least 8 characters. Share it with the user."
      />
      <div className="small muted col-span-full">{role.help}</div>
      {form.role === 'VIEWER' && (
        <Note className="col-span-full">
          After creating a doctor, open them in the list and grant their patients. A doctor with no
          patients sees empty lists.
        </Note>
      )}
      {validation && <ErrorBox className="col-span-full" message={validation} />}
      {createUser.isError && (
        <ErrorBox
          className="col-span-full"
          message={
            createUser.error?.code === 'USER_ALREADY_EXISTS'
              ? 'A user with this email already exists.'
              : createUser.error?.message
          }
        />
      )}
      <div className="row col-span-full" style={{ gap: '8px' }}>
        <Button variant="acc" type="submit" loading={createUser.isPending}>
          Create user
        </Button>
        <Button onClick={onCancel} disabled={createUser.isPending}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
