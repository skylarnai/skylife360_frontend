import { useDeferredValue, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CLAIM_STAGE_MAP, getClaimStageInfo, getPipelineStageInfo } from '@/constants/statusMaps'
import { PERMISSIONS } from '@/constants/permissions'
import { ApiRail } from '@/components/dev/ApiRail'
import { TwoColumn } from '@/components/layout/TwoColumn'
import {
  Button,
  Chip,
  DataTable,
  ErrorBox,
  Pagination,
  SearchInput,
  Select,
  Tile,
  TileGrid,
} from '@/components/ui'
import { uploadErrorMessage } from '@/features/ingestion/utils/fileResultView'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { usePermission } from '@/hooks/usePermission'
import { formatMoney } from '@/utils/formatters'
import { NewClaimForm } from '../components/NewClaimForm'
import { useClaims } from '../hooks/useClaims'

const WORKLIST_APIS = [
  [
    'GET',
    '/api/v1/claims?stage=&payer=&q=&limit=&offset=',
    'READY',
    'Claim list + summary tiles · pipeline_stage per row',
  ],
  ['POST', '/api/v1/claims', 'READY', 'New claim (grants the patient to this hospital)'],
  ['GET', '/api/v1/claims/{claim_id}', 'READY', 'Claim header on the desk'],
]

const STAGE_OPTIONS = [
  { value: 'all', label: 'All stages' },
  ...Object.keys(CLAIM_STAGE_MAP).map((stage) => ({ value: stage, label: stage })),
]

const PAGE_SIZE = 25

const NEXT_ACTION_TONE = { pos: 'ok', neutral: 'grey' }

const COLUMNS = [
  {
    key: 'claim_id',
    header: 'CLAIM',
    render: (row) => (
      <span className="mono" style={{ fontSize: '12.5px', color: 'var(--accent)' }}>
        {row.claim_id}
      </span>
    ),
  },
  {
    key: 'patient',
    header: 'PATIENT',
    render: (row) => (
      <span style={{ display: 'grid' }}>
        {row.patient?.name && <span>{row.patient.name}</span>}
        <span className="mono muted" style={{ fontSize: '12px' }}>
          {row.user_id}
        </span>
      </span>
    ),
  },
  {
    key: 'procedure_name',
    header: 'PROCEDURE',
    render: (row) => row.procedure_name || <span className="muted">—</span>,
  },
  {
    key: 'payer',
    header: 'PAYER',
    cellClassName: 'small muted',
    render: (row) => [row.payer_name, row.tpa_name].filter(Boolean).join(' · ') || '—',
  },
  {
    key: 'documents',
    header: 'DOCS',
    num: true,
    cellClassName: 'mono small',
    render: (row) => {
      const counts = row.document_counts
      if (!counts?.files) return <span className="muted">0</span>
      return (
        <span title={`${counts.ready} ready · ${counts.failed} failed`}>
          {counts.ready}/{counts.files}
        </span>
      )
    },
  },
  {
    key: 'estimated_amount',
    header: 'AMOUNT',
    num: true,
    render: (row) => formatMoney(row.estimated_amount),
  },
  {
    key: 'stage',
    header: 'STAGE',
    render: (row) => {
      const st = getClaimStageInfo(row.stage)
      return <Chip tone={st.tone}>{st.label}</Chip>
    },
  },
  {
    key: 'pipeline_stage',
    header: 'REVIEW',
    render: (row) => {
      const ps = getPipelineStageInfo(row.pipeline_stage)
      return ps ? <Chip tone={ps.tone}>{ps.label}</Chip> : <span className="muted">—</span>
    },
  },
  {
    key: 'next_action',
    header: 'NEXT',
    render: (row) =>
      row.next_action?.text ? (
        <Chip tone={NEXT_ACTION_TONE[row.next_action.tone] || row.next_action.tone || 'grey'}>
          {row.next_action.text}
        </Chip>
      ) : (
        <span className="muted">—</span>
      ),
  },
]

export function ClaimsWorklistPage() {
  useDocumentTitle('Claims')
  const navigate = useNavigate()
  const canCreate = usePermission(PERMISSIONS.FILES_UPLOAD)

  const [stage, setStage] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [creating, setCreating] = useState(false)
  const q = useDeferredValue(search.trim())

  const { data, isLoading, isFetching, isError, error, refetch } = useClaims({
    stage,
    q,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  })

  const claims = data?.items || []
  const total = data?.total ?? 0
  const summary = data?.summary

  const tiles = [
    ['open claims', summary?.open_claims],
    ['awaiting approval', summary?.awaiting_approval],
    ['items to fix', summary?.items_to_fix],
    ['settled this week', summary?.settled_this_week],
  ]

  const openClaim = (row) =>
    navigate(`/claims/${encodeURIComponent(row.claim_id)}/${row.current_step || 'upload'}`)

  return (
    <TwoColumn
      main={
        <>
          <div className="between" style={{ alignItems: 'center' }}>
            <h2 style={{ fontSize: '20px' }}>Claims</h2>
            {canCreate && !creating && (
              <Button variant="acc" onClick={() => setCreating(true)}>
                + New claim
              </Button>
            )}
          </div>

          {creating && (
            <NewClaimForm
              onCancel={() => setCreating(false)}
              onCreated={(claim) => {
                setCreating(false)
                navigate(`/claims/${encodeURIComponent(claim.claim_id)}/upload`)
              }}
            />
          )}

          <TileGrid>
            {tiles.map(([label, value]) => (
              <Tile key={label} label={label} value={isLoading ? '…' : String(value ?? 0)} />
            ))}
          </TileGrid>

          <div className="row" style={{ gap: '8px' }}>
            <div style={{ flex: '1 1 260px' }}>
              <SearchInput
                placeholder="Search claim, patient or procedure"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(0)
                }}
                aria-label="Search claims"
              />
            </div>
            <div style={{ flex: '0 1 200px' }}>
              <Select
                options={STAGE_OPTIONS}
                value={stage}
                onChange={(e) => {
                  setStage(e.target.value)
                  setPage(0)
                }}
                aria-label="Filter by stage"
              />
            </div>
          </div>

          {isError ? (
            <ErrorBox message={uploadErrorMessage(error)} onRetry={refetch} />
          ) : (
            <>
              <DataTable
                columns={COLUMNS}
                rows={claims}
                rowKey="claim_id"
                loading={isLoading}
                minWidth={1000}
                emptyMessage={
                  q || stage !== 'all'
                    ? 'No claims match these filters.'
                    : 'No claims yet. Create one with “New claim”.'
                }
                onRowClick={openClaim}
              />
              <Pagination
                page={page}
                pageSize={PAGE_SIZE}
                total={total}
                disabled={isFetching}
                onChange={setPage}
                noun="claims"
              />
            </>
          )}
        </>
      }
      rail={<ApiRail title="claims" apis={WORKLIST_APIS} />}
    />
  )
}
