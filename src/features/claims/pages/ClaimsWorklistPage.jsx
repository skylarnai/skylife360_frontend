import { useNavigate } from 'react-router-dom'
import { getClaimStageInfo } from '@/constants/statusMaps'
import { ApiRail } from '@/components/dev/ApiRail'
import { TwoColumn } from '@/components/layout/TwoColumn'
import { Button, Chip, DataTable, ErrorBox, Tile, TileGrid } from '@/components/ui'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { formatMoney } from '@/utils/formatters'
import { useClaims, usePendingReviewsCount } from '../hooks/useClaims'

const WORKLIST_APIS = [
  ['GET', '/api/v1/claims/intake/{intake_id}', 'READY', 'One claim intake record'],
  ['GET', '/api/v1/reviews/pending', 'READY', 'Claims waiting for approval (tile count)'],
  ['GET', '/api/v1/claims/submissions', 'READY', 'Submitted claims and their status'],
  [
    'GET',
    '/api/v1/claims?stage=&page=',
    'NEEDED',
    'Paged claim list for this table (claim, patient, payer, amount, stage)',
  ],
]

export function ClaimsWorklistPage() {
  useDocumentTitle('Claims')
  const navigate = useNavigate()
  const { data, isLoading, isError, error, refetch } = useClaims()
  const { data: pendingReviews } = usePendingReviewsCount()

  const claims = data?.items || []
  const awaitingApprovalCount =
    pendingReviews?.total ?? data?.summary?.awaiting_approval ?? 1

  const tiles = [
    ['open claims', String(data?.summary?.open_claims ?? 3)],
    ['awaiting approval', String(awaitingApprovalCount)],
    ['items to fix', String(data?.summary?.items_to_fix ?? 4)],
    ['settled this week', String(data?.summary?.settled_this_week ?? 1)],
  ]

  const columns = [
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
      key: 'user_id',
      header: 'PATIENT',
      render: (row) => (
        <span className="mono" style={{ fontSize: '12.5px' }}>
          {row.user_id}
        </span>
      ),
    },
    {
      key: 'procedure_name',
      header: 'PROCEDURE',
    },
    {
      key: 'payer_display',
      header: 'PAYER',
      cellClassName: 'small muted',
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
      key: 'status',
      header: 'STATUS',
      render: (row) => (
        <Chip tone={row.next_action?.tone || 'grey'}>
          {row.next_action?.text || '—'}
        </Chip>
      ),
    },
    {
      key: 'action',
      header: '',
      render: (row) =>
        row.is_loaded_demo ? (
          <Button
            size="sm"
            variant="pri"
            onClick={(e) => {
              e.stopPropagation()
              navigate(`/claims/${row.claim_id}/${row.current_step || 'upload'}`)
            }}
          >
            Open
          </Button>
        ) : (
          <Button
            size="sm"
            disabled
            title="Only SUV-261028-01 is loaded in this demo"
          >
            Open
          </Button>
        ),
    },
  ]

  return (
    <TwoColumn
      main={
        <>
          <h2 style={{ fontSize: '20px' }}>Claims</h2>
          <TileGrid>
            {tiles.map(([label, value]) => (
              <Tile key={label} label={label} value={value} />
            ))}
          </TileGrid>
          {isError ? (
            <ErrorBox message={error?.message} onRetry={refetch} />
          ) : (
            <DataTable
              columns={columns}
              rows={claims}
              rowKey="claim_id"
              loading={isLoading}
              minWidth={820}
              onRowClick={(row) => {
                if (row.is_loaded_demo) {
                  navigate(`/claims/${row.claim_id}/${row.current_step || 'upload'}`)
                }
              }}
            />
          )}
        </>
      }
      rail={<ApiRail title="claims" apis={WORKLIST_APIS} />}
    />
  )
}
