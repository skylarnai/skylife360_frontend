import { useState } from 'react'
import { ApiRail } from '@/components/dev/ApiRail'
import { TwoColumn } from '@/components/layout/TwoColumn'
import { Button, Chip, DataTable, ErrorBox, Pagination, Select } from '@/components/ui'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { usePageState } from '@/hooks/usePageState'
import { formatTableDate } from '@/utils/formatters'
import { CreateUserForm } from '../components/CreateUserForm'
import { UserDetailPanel } from '../components/UserDetailPanel'
import { BACKEND_ROLES, getRoleInfo, usesRoleDefaults } from '../constants'
import { useUsers } from '../hooks/useUsers'

const USERS_APIS = [
  [
    'GET',
    '/api/v1/users?role=&limit=&offset=',
    'READY',
    'Users of this hospital with effective permissions',
  ],
  ['POST', '/api/v1/users', 'READY', '{ email, name, role, temporary_password, permissions? }'],
  [
    'PATCH',
    '/api/v1/users/{id}',
    'READY',
    'Role, permissions, enable / disable (signs the user out)',
  ],
  ['GET', '/api/v1/users/{id}/user-access', 'READY', 'Patients granted to the user'],
  ['POST', '/api/v1/users/{id}/user-access', 'READY', '{ user_ids: [patient IDs] }'],
  ['DELETE', '/api/v1/users/{id}/user-access/{patient_id}', 'READY', 'Remove a patient'],
]

const ROLE_FILTER = [
  { value: '', label: 'All roles' },
  ...BACKEND_ROLES.map((r) => ({ value: r.value, label: r.label })),
]

const COLUMNS = [
  {
    key: 'name',
    header: 'USER',
    render: (row) => (
      <>
        <b style={{ fontWeight: 600 }}>{row.name}</b>
        <div className="mono small muted">{row.email}</div>
      </>
    ),
  },
  {
    key: 'role',
    header: 'ROLE',
    render: (row) => {
      const role = getRoleInfo(row.role)
      return (
        <span className="row" style={{ gap: '4px' }}>
          <Chip tone={role.tone}>{role.chip}</Chip>
          {!usesRoleDefaults(row) && <Chip tone="grey">CUSTOM</Chip>}
        </span>
      )
    },
  },
  {
    key: 'is_active',
    header: 'STATUS',
    render: (row) => (
      <Chip tone={row.is_active ? 'ok' : 'red'}>{row.is_active ? 'ACTIVE' : 'DISABLED'}</Chip>
    ),
  },
  {
    key: 'created_at',
    header: 'CREATED',
    cellClassName: 'small muted',
    render: (row) => formatTableDate(row.created_at),
  },
]

const PAGE_SIZE = 25

/** S04 Users & access (needs users:manage): create users, roles, patient grants, permissions. */
export function UsersPage() {
  useDocumentTitle('Users & access')
  const [roleFilter, setRoleFilter] = useState('')
  const [creating, setCreating] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [lastSelected, setLastSelected] = useState(null)
  const [page, setPage] = usePageState(roleFilter)
  const { data, isLoading, isFetching, isError, error, refetch } = useUsers({
    ...(roleFilter ? { role: roleFilter } : {}),
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  })

  const users = data?.items || []
  const total = data?.total ?? 0
  // The selected user may be on another page: keep the last copy so the panel stays open.
  const selected =
    users.find((u) => u.id === selectedId) ||
    (lastSelected?.id === selectedId ? lastSelected : null)
  const select = (user) => {
    setSelectedId(user.id)
    setLastSelected(user)
  }

  return (
    <TwoColumn
      main={
        <>
          <div className="between" style={{ alignItems: 'center' }}>
            <h2 style={{ fontSize: '20px' }}>Users &amp; access</h2>
            {!creating && (
              <Button variant="acc" onClick={() => setCreating(true)}>
                + New user
              </Button>
            )}
          </div>

          {creating && (
            <CreateUserForm
              onCancel={() => setCreating(false)}
              onCreated={(user) => {
                setCreating(false)
                select(user)
              }}
            />
          )}

          <div style={{ maxWidth: '220px' }}>
            <Select
              aria-label="Filter by role"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              options={ROLE_FILTER}
            />
          </div>

          {isError ? (
            <ErrorBox message={error?.message} onRetry={refetch} />
          ) : (
            <DataTable
              columns={COLUMNS}
              rows={users}
              rowKey="id"
              loading={isLoading}
              minWidth={600}
              emptyMessage="No users yet. Create one with “New user”."
              onRowClick={select}
            />
          )}

          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            disabled={isFetching}
            onChange={setPage}
            noun="users"
          />

          <div className="small muted">
            Doctors see only the patients granted to them. Records staff and admins see the whole
            hospital. Integrity, approve and submit need an admin or a user with those permissions.
          </div>
        </>
      }
      rail={
        <>
          {selected ? (
            <UserDetailPanel
              key={selected.id}
              user={selected}
              onClose={() => setSelectedId(null)}
            />
          ) : (
            <div className="card pad small muted">
              Select a user to manage their role, patients and permissions.
            </div>
          )}
          <ApiRail title="users" apis={USERS_APIS} />
        </>
      }
    />
  )
}
