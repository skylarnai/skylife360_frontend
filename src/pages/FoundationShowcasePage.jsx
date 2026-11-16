import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { MESSAGES } from '@/constants/messages'
import { PERMISSIONS } from '@/constants/permissions'
import { getLandingRoute, ROUTES } from '@/constants/routes'
import {
  getClaimStageInfo,
  getDocTypeLabel,
  getFileStatusInfo,
  getIntegrityFlagInfo,
} from '@/constants/statusMaps'
import { ActivityRail, Can, EmptyStep, Logo } from '@/components/common'
import { ApiRail } from '@/components/dev/ApiRail'
import { TwoColumn } from '@/components/layout'
import {
  Button,
  Card,
  CardPad,
  Chip,
  DataTable,
  ErrorBox,
  Field,
  Kv,
  Lbl,
  Note,
  Pill,
  SearchInput,
  Select,
  TextArea,
  TextInput,
  Tile,
  TileGrid,
} from '@/components/ui'
import { useActivity } from '@/hooks/useActivity'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { usePermission } from '@/hooks/usePermission'
import { useSession } from '@/hooks/useSession'
import { authApi } from '@/services/auth/authApi'
import { useSessionStore } from '@/store/sessionStore'
import { useUiStore } from '@/store/uiStore'
import { formatMoney, formatTableDate, formatTimelineDate } from '@/utils/formatters'

const SAMPLE_CLAIMS = [
  {
    id: 'SUV-261028-01',
    patient: 'SYN-P-1042',
    procedure: 'Laparoscopic cholecystectomy',
    payer: 'Insurer SYN-07 · TPA SYN-3',
    amount: 148600,
    stage: 'Pre-submission',
    statusLabel: '3 items to fix',
    statusTone: 'amb',
    uploadedAt: '2026-10-28T11:27:00',
  },
  {
    id: 'SUV-261027-03',
    patient: 'SYN-P-1077',
    procedure: 'PTCA with single DES',
    payer: 'PM-JAY',
    amount: 110000,
    stage: 'In treatment',
    statusLabel: 'Pre-auth approved',
    statusTone: 'ok',
    uploadedAt: '2026-10-26T22:10:00',
  },
  {
    id: 'SUV-261026-02',
    patient: 'SYN-P-1103',
    procedure: 'Elective LSCS',
    payer: 'Insurer SYN-02',
    amount: 62400,
    stage: 'Discharge',
    statusLabel: 'Discharge summary not signed',
    statusTone: 'amb',
    uploadedAt: '2026-10-27T16:02:00',
  },
  {
    id: 'SUV-261025-05',
    patient: 'SYN-P-1120',
    procedure: 'Phaco + IOL, right eye',
    payer: 'Insurer SYN-07 · TPA SYN-3',
    amount: 38900,
    stage: 'Settled',
    statusLabel: 'Paid ₹36,450',
    statusTone: 'ok',
    uploadedAt: '2026-10-20T15:40:00',
  },
]

const FOUNDATION_APIS = [
  {
    method: 'GET',
    path: '/api/v1/auth/me',
    tag: 'NEEDED',
    note: 'App start: user, role, permissions, hospital, csrf_token. 401 → login.',
  },
  {
    method: 'POST',
    path: '/api/v1/auth/logout',
    tag: 'NEEDED',
    note: 'Sign out and clear session cookie',
  },
  {
    method: 'GET',
    path: '/api/v1/statuses',
    tag: 'READY',
    note: 'Status code → label maps (file, extraction, review). Cached for session.',
  },
]

const FOUNDATION_SNIPPET = `GET /api/v1/auth/me
Cookie: sc_session=<HttpOnly>

200 OK
{
  "user": { "id": "usr-admin-01", "name": "A. Rao", "title": "Claims admin" },
  "role": "ADMIN",
  "hospital": { "name": "Suvidha Hospital", "city": "Hyderabad" },
  "csrf_token": "csrf-syn-admin-01"
}`

function ThemePreviewBox({ themeMode, title }) {
  return (
    <div
      data-theme={themeMode}
      className="rounded-[10px] border border-line bg-bg p-4 text-fg"
      style={{ colorScheme: themeMode }}
    >
      <div className="stack">
        <div className="between">
          <Lbl>{title}</Lbl>
          <Chip tone="ok">READY</Chip>
        </div>
        <CardPad className="stack">
          <div className="between">
            <h3 style={{ fontSize: '16px' }}>Suvidha Hospital · SYN-P-1042</h3>
            <Pill tone="amb">3 to fix</Pill>
          </div>
          <TileGrid>
            <Tile label="open claims" value="3" />
            <Tile label="claim value" value={formatMoney(148600)} />
          </TileGrid>
          <div className="row">
            <Button variant="pri" size="sm">
              Primary
            </Button>
            <Button variant="acc" size="sm">
              Accent
            </Button>
            <Button variant="warn" size="sm">
              Warn
            </Button>
            <Chip tone="teal">ADMISSION</Chip>
            <Chip tone="red">COULDN&apos;T READ</Chip>
          </div>
          <Kv label="Timeline date (formatTimelineDate)" value={formatTimelineDate('2026-10-09')} />
        </CardPad>
      </div>
    </div>
  )
}

export function FoundationShowcasePage() {
  useDocumentTitle('S00 Foundation')
  const location = useLocation()
  const navigate = useNavigate()
  const { user, role, permissions } = useSession()
  const { log } = useActivity()
  const theme = useUiStore((state) => state.theme)
  const setTheme = useUiStore((state) => state.setTheme)
  const canApprove = usePermission(PERMISSIONS.CLAIMS_APPROVE)

  const [selectedClaimId, setSelectedClaimId] = useState('SUV-261028-01')
  const [tableLoading, setTableLoading] = useState(false)
  const [buttonLoading, setButtonLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [docTypeFilter, setDocTypeFilter] = useState('all')
  const [rationale, setRationale] = useState('')

  const filteredClaims = SAMPLE_CLAIMS.filter((item) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      item.id.toLowerCase().includes(q) ||
      item.patient.toLowerCase().includes(q) ||
      item.procedure.toLowerCase().includes(q)
    )
  })

  const columns = [
    {
      key: 'id',
      header: 'CLAIM',
      render: (row) => (
        <span className="mono" style={{ fontSize: '12.5px', color: 'var(--accent)' }}>
          {row.id}
        </span>
      ),
    },
    {
      key: 'patient',
      header: 'PATIENT',
      render: (row) => (
        <span className="mono" style={{ fontSize: '12.5px' }}>
          {row.patient}
        </span>
      ),
    },
    {
      key: 'procedure',
      header: 'PROCEDURE',
    },
    {
      key: 'payer',
      header: 'PAYER',
      cellClassName: 'small muted',
    },
    {
      key: 'amount',
      header: 'AMOUNT',
      num: true,
      render: (row) => formatMoney(row.amount),
    },
    {
      key: 'stage',
      header: 'STAGE',
      render: (row) => {
        const info = getClaimStageInfo(row.stage)
        return <Chip tone={info.tone}>{info.label}</Chip>
      },
    },
    {
      key: 'statusLabel',
      header: 'STATUS',
      render: (row) => <Chip tone={row.statusTone}>{row.statusLabel}</Chip>,
    },
    {
      key: 'uploadedAt',
      header: 'UPDATED',
      cellClassName: 'small muted',
      render: (row) => formatTableDate(row.uploadedAt),
    },
  ]

  const trigger401Simulation = () => {
    const currentPath = `${location.pathname}${location.search}${location.hash}`
    try {
      window.sessionStorage.setItem('skyclaims.logged_out', '1')
    } catch {
      // ignore
    }
    useSessionStore.getState().clearSession(currentPath)
    window.dispatchEvent(
      new CustomEvent('skyclaims:unauthorized', {
        detail: { from: currentPath },
      })
    )
  }

  const handleSimulateButtonLoad = () => {
    setButtonLoading(true)
    log('ran the gap check: 3 to fix')
    setTimeout(() => {
      setButtonLoading(false)
    }, 600)
  }

  return (
    <TwoColumn
      main={
        <>
          <CardPad className="stack">
            <div className="between">
              <div>
                <Lbl>S00 — Foundation showcase</Lbl>
                <h1 style={{ fontSize: '22px', marginTop: '2px' }}>
                  Theme, app shell, shared components &amp; session guards
                </h1>
              </div>
              <div className="row">
                <Pill tone="ok">S00 Built</Pill>
                <Pill tone="teal">Role: {role}</Pill>
              </div>
            </div>

            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div className="row">
                <Lbl>Theme:</Lbl>
                {['system', 'light', 'dark'].map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    className="qbtn"
                    aria-pressed={theme === mode}
                    onClick={() => setTheme(mode)}
                  >
                    {mode === 'system' ? 'OS Auto' : mode === 'light' ? 'Light' : 'Dark'}
                  </button>
                ))}
              </div>

            </div>

            <div className="row">
              <Button
                size="sm"
                variant="acc"
                onClick={() => log('ran the gap check: 3 to fix')}
              >
                Log sample activity
              </Button>
              <Button size="sm" variant="warn" onClick={trigger401Simulation}>
                Simulate 401 mid-session
              </Button>
              <Button
                size="sm"
                onClick={() => navigate(ROUTES.USERS)}
              >
                Test Admin route (/users)
              </Button>
            </div>
          </CardPad>

          {/* Both themes side-by-side */}
          <CardPad className="stack">
            <div className="between">
              <h2 style={{ fontSize: '18px' }}>Light &amp; Dark Theme Tokens Preview</h2>
              <span className="small muted">Side-by-side comparison of `:root` and `[data-theme=&quot;dark&quot;]`</span>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '12px',
              }}
            >
              <ThemePreviewBox themeMode="light" title="Light theme (--bg #F2F5F8)" />
              <ThemePreviewBox themeMode="dark" title="Dark theme (--bg #0B1622)" />
            </div>
          </CardPad>

          {/* Tiles */}
          <CardPad className="stack">
            <div className="between">
              <h2 style={{ fontSize: '18px' }}>Tiles &amp; Status Pills</h2>
              <div className="row">
                <Pill tone="ok">Documents ready</Pill>
                <Pill tone="amb">3 to fix</Pill>
                <Pill tone="red">1 file couldn&apos;t be read</Pill>
                <Pill tone="teal">Waiting for documents</Pill>
                <Pill tone="grey">0 failed</Pill>
              </div>
            </div>
            <TileGrid>
              <Tile label="open claims" value="3" />
              <Tile label="awaiting approval" value="1" />
              <Tile label="items to fix" value="4" valueColor="var(--amb)" />
              <Tile label="accepted" value="7" valueColor="var(--ok)" />
              <Tile label="not allowed" value="1" valueColor="var(--red)" />
              <Tile label="estimated value" value={formatMoney(148600)} />
            </TileGrid>
          </CardPad>

          {/* Buttons & Chips */}
          <CardPad className="stack">
            <h2 style={{ fontSize: '18px' }}>Buttons &amp; Chips</h2>
            <div className="row">
              <Button>Default (md)</Button>
              <Button variant="pri">Primary Navy</Button>
              <Button variant="acc">Accent</Button>
              <Button variant="warn">Warn Amber</Button>
              <Button size="sm">Small (36px)</Button>
              <Button variant="pri" loading={buttonLoading} onClick={handleSimulateButtonLoad}>
                {buttonLoading ? 'Running…' : 'Click for Spinner'}
              </Button>
              <Button disabled>Disabled</Button>
            </div>

            <div className="stack" style={{ gap: '8px' }}>
              <Lbl>File status maps (`statusMaps.js`)</Lbl>
              <div className="row">
                {['INDEXED', 'DUPLICATE', 'EXTRACTION_FAILED'].map((st) => {
                  const info = getFileStatusInfo(st)
                  return (
                    <Chip key={st} tone={info.tone}>
                      {info.label}
                    </Chip>
                  )
                })}
                {['admission', 'lab', 'operative', 'discharge', 'billing'].map((cls) => (
                  <Chip key={cls} tone="teal">
                    {getDocTypeLabel(cls)}
                  </Chip>
                ))}
                {['PASS', 'SOFT_WARN', 'HARD_FAIL'].map((flag) => {
                  const info = getIntegrityFlagInfo(flag)
                  return (
                    <Chip key={flag} tone={info.tone}>
                      {info.label}
                    </Chip>
                  )
                })}
              </div>
            </div>
          </CardPad>

          {/* DataTable */}
          <CardPad className="stack">
            <div className="between">
              <div>
                <h2 style={{ fontSize: '18px' }}>DataTable (`.tblw`)</h2>
                <span className="small muted">
                  Clickable rows have `tabIndex=0` and open on Enter or Space. Selected: {selectedClaimId}
                </span>
              </div>
              <Button size="sm" onClick={() => setTableLoading((v) => !v)}>
                {tableLoading ? 'Show rows' : 'Toggle skeleton loading'}
              </Button>
            </div>

            <DataTable
              columns={columns}
              rows={filteredClaims}
              selectedRowId={selectedClaimId}
              loading={tableLoading}
              minWidth={760}
              onRowClick={(row) => {
                setSelectedClaimId(row.id)
                log(`selected claim ${row.id} (${row.patient})`)
              }}
            />
          </CardPad>

          {/* Form Fields */}
          <CardPad className="stack">
            <h2 style={{ fontSize: '18px' }}>Form Fields (`Field`, `TextInput`, `SearchInput`, `Select`, `TextArea`)</h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '10px',
              }}
            >
              <SearchInput
                label="Search claims by ID, patient or procedure"
                placeholder="e.g. SUV-261028-01, SYN-P-1042"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Select
                label="Document type"
                value={docTypeFilter}
                onChange={(e) => setDocTypeFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'All types' },
                  { value: 'admission', label: getDocTypeLabel('admission') },
                  { value: 'lab', label: getDocTypeLabel('lab') },
                  { value: 'operative', label: getDocTypeLabel('operative') },
                  { value: 'discharge', label: getDocTypeLabel('discharge') },
                  { value: 'billing', label: getDocTypeLabel('billing') },
                ]}
              />
              <TextInput
                label="Patient ID"
                defaultValue="SYN-P-1042"
                hint="Synthetic patient identifier"
              />
            </div>
            <Field label="Reason (required when you override a warning or send the claim back)">
              <TextArea
                rows={2}
                placeholder="e.g. Image was rotated by the records team; histopathology to follow."
                value={rationale}
                onChange={(e) => setRationale(e.target.value)}
              />
            </Field>
          </CardPad>

          {/* Notes, ErrorBox, EmptyStep, Kv, Can */}
          <CardPad className="stack">
            <h2 style={{ fontSize: '18px' }}>Notes, Shared States, Key-Value &amp; Permission Gate (`Can`)</h2>

            <Note tone="amb">
              Enforce roles in the API, not only in the UI. Search and answers already filter by hospital.
            </Note>
            <Note tone="live">
              Claim packet assembled and verified against Insurer SYN-07 rules.
            </Note>
            <Note tone="plum">
              Visible to admins only. Doctors and staff only see that a claim is on hold.
            </Note>

            <ErrorBox
              message="Reading the scan timed out. It can be tried again."
              onRetry={() => log('anaesthesia_record.jpg read on the second try')}
            />
            <ErrorBox message={MESSAGES.ACCESS_DENIED} />
            <ErrorBox
              message={MESSAGES.STALE_VERSION}
              retryLabel="Reload"
              onRetry={() => log('reloaded latest task version')}
            />

            <EmptyStep
              message="Nothing uploaded yet."
              actionText="Go to step 1."
              onAction={() => log('navigated to step 1 (upload)')}
            />

            <Card className="pad stack" style={{ gap: '6px' }}>
              <Lbl>Key / Value rows (`Kv`) &amp; Permission Gate (`Can`)</Lbl>
              <Kv label="Signed-in user" value={`${user?.name} (${user?.email})`} />
              <Kv label="Active permissions" value={permissions.join(', ')} />
              <Kv
                label="usePermission('claims:approve')"
                value={canApprove ? 'Allowed (✓)' : 'Hidden for this role (–)'}
              />
              <Can
                permission={PERMISSIONS.CLAIMS_APPROVE}
                fallback={
                  <div className="small muted">
                    <code>&lt;Can permission=&quot;claims:approve&quot;&gt;</code> is currently hiding the Admin approval button because you are signed in as {role}.
                  </div>
                }
              >
                <div className="row">
                  <Button variant="pri" size="sm" onClick={() => log('approved the claim')}>
                    Confirm approval (claims:approve)
                  </Button>
                </div>
              </Can>
            </Card>
          </CardPad>
        </>
      }
      rail={
        <>
          <ApiRail
            title="foundation"
            apis={FOUNDATION_APIS}
            snippet={FOUNDATION_SNIPPET}
          />
          <ActivityRail />
        </>
      }
    />
  )
}

export function RoutePlaceholderPage({ screenId, title, roleNote, apis = [] }) {
  useDocumentTitle(title)
  const location = useLocation()

  return (
    <TwoColumn
      main={
        <CardPad className="stack">
          <div className="between">
            <div>
              <Lbl>{screenId}</Lbl>
              <h1 style={{ fontSize: '20px', marginTop: '2px' }}>{title}</h1>
            </div>
            <Chip tone="teal">{location.pathname}</Chip>
          </div>
          <p className="muted" style={{ margin: 0 }}>
            {roleNote || 'Shell route ready. Screen content will be implemented in its dedicated module.'}
          </p>
        </CardPad>
      }
      rail={
        <>
          <ApiRail title={title.toLowerCase()} apis={apis} />
          <ActivityRail />
        </>
      }
    />
  )
}

export function LoginStubPage() {
  useDocumentTitle('Sign in')
  const location = useLocation()
  const navigate = useNavigate()
  const setSession = useSessionStore((state) => state.setSession)
  const returnToPath = useSessionStore((state) => state.returnToPath)
  const setReturnToPath = useSessionStore((state) => state.setReturnToPath)
  const logActivity = useUiStore((state) => state.logActivity)

  const savedFrom = location.state?.from || returnToPath

  const handleSignIn = async (roleKey) => {
    const profile = await authApi.login({ roleKey })
    setSession(profile)
    setReturnToPath(null)
    logActivity(
      `signed in as ${profile.role === 'ADMIN' ? 'Admin' : 'Doctor / Staff'}`,
      profile.user.name
    )
    const target = savedFrom || getLandingRoute(profile.role)
    navigate(target, { replace: true })
  }

  return (
    <div className="wrap py-12">
      <CardPad className="mx-auto max-w-[540px] stack">
        <div className="between">
          <Logo />
          <Chip tone="amb">S01 LOGIN STUB</Chip>
        </div>
        <div className="stack" style={{ gap: '6px' }}>
          <h1 style={{ fontSize: '24px' }}>Welcome back</h1>
          <p className="muted" style={{ margin: 0 }}>
            Choose a demo account to start a session.
            {savedFrom && (
              <>
                {' '}
                After signing in, you will return to <code>{savedFrom}</code>.
              </>
            )}
          </p>
        </div>
        <div className="stack" style={{ gap: '8px' }}>
          <Button variant="pri" onClick={() => handleSignIn('admin')}>
            Sign in as A. Rao · Admin (a.rao@suvidha.demo)
          </Button>
          <Button onClick={() => handleSignIn('doctor')}>
            Sign in as Dr. S. Menon · Doctor (s.menon@suvidha.demo)
          </Button>
          <Button onClick={() => handleSignIn('records_staff')}>
            Sign in as K. Iyer · Records staff (k.iyer@suvidha.demo)
          </Button>
        </div>
      </CardPad>
    </div>
  )
}
