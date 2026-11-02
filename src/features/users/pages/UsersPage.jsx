import { env } from '@/config/env'
import { ApiRail } from '@/components/dev/ApiRail'
import { TwoColumn } from '@/components/layout/TwoColumn'
import { Chip, DataTable, ErrorBox, Note } from '@/components/ui'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useUiStore } from '@/store/uiStore'
import { ROLE_CAPABILITY_MATRIX } from '../api/usersApi.mock'
import { useUsers } from '../hooks/useUsers'

const USERS_APIS = [
  ['POST', '/api/v1/auth/login', 'NEEDED', 'Session cookie carrying the user’s role'],
  ['GET', '/api/v1/users', 'NEEDED', 'Users of this hospital with role'],
  ['PATCH', '/api/v1/users/{id}', 'NEEDED', 'Change role or disable'],
]

export function UsersPage() {
  useDocumentTitle('Users & access')
  const apiPanel = useUiStore((state) => state.apiPanel)
  const { data, isLoading, isError, error, refetch } = useUsers()

  const users = data?.items || []

  const userColumns = [
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
      key: 'title',
      header: 'TITLE',
    },
    {
      key: 'role',
      header: 'ROLE',
      render: (row) => {
        const isAdmin = String(row.role).toUpperCase() === 'ADMIN'
        return (
          <Chip tone={isAdmin ? 'amb' : 'teal'}>
            {isAdmin ? 'ADMIN' : 'DOCTOR / STAFF'}
          </Chip>
        )
      },
    },
    {
      key: 'tenant_id',
      header: 'HOSPITAL',
      cellClassName: 'small muted',
      render: (row) => row.tenant_id || 'tenant SYN-HOSP-01',
    },
  ]

  const matrixRows = ROLE_CAPABILITY_MATRIX.map(([action, adminAccess, doctorAccess], idx) => ({
    id: `m-${idx}`,
    action,
    adminAccess,
    doctorAccess,
  }))

  const matrixColumns = [
    { key: 'action', header: 'ACTION' },
    { key: 'adminAccess', header: 'ADMIN' },
    { key: 'doctorAccess', header: 'DOCTOR / STAFF' },
  ]

  return (
    <TwoColumn
      main={
        <>
          <h2 style={{ fontSize: '20px' }}>Users &amp; access</h2>
          {isError ? (
            <ErrorBox message={error?.message} onRetry={refetch} />
          ) : (
            <DataTable
              columns={userColumns}
              rows={users}
              loading={isLoading}
              minWidth={600}
            />
          )}

          <h3 style={{ fontSize: '16px' }}>What each role can do</h3>
          <DataTable
            columns={matrixColumns}
            rows={matrixRows}
            minWidth={560}
          />
        </>
      }
      rail={
        <>
          <ApiRail title="users" apis={USERS_APIS} />
          {env.showApiPanel && apiPanel && (
            <Note className="small">
              Enforce roles in the API, not only in the UI. Search and answers already filter by
              hospital and <code>user_id</code>; add role checks on top.
            </Note>
          )}
        </>
      }
    />
  )
}
