import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ApiRail } from '@/components/dev/ApiRail'
import { MY_TODOS_APIS } from '@/constants/doctorFlowApis'
import { ActivityRail } from '@/components/common'
import { Button, CardPad, ErrorBox, Note, Pagination, Select } from '@/components/ui'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useSession } from '@/hooks/useSession'
import { GapReportCard } from '../components/GapReportCard'
import { TaskCard } from '../components/TaskCard'
import { useGapInbox } from '../hooks/useGapInbox'
import { useTasks } from '../hooks/useTasks'

const PAGE_SIZE = 20

const TASK_STATUS_OPTIONS = [
  { value: 'OPEN', label: 'Open' },
  { value: 'DONE', label: 'Done' },
  { value: 'ALL', label: 'All' },
]

const ASSIGNEE_OPTIONS = [
  { value: 'me', label: 'Mine (me and my team)' },
  { value: 'all', label: 'Everyone’s' },
]

const REPORT_STATUS_OPTIONS = [
  { value: 'AVAILABLE', label: 'To fix' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'ALL', label: 'All reports' },
]

function Pager({ page, total, isFetching, onChange, noun }) {
  return (
    <Pagination
      page={page - 1}
      pageSize={PAGE_SIZE}
      total={total}
      disabled={isFetching}
      onChange={(p) => onChange(p + 1)}
      noun={noun}
    />
  )
}

function FilterSelect({ options, value, onChange, label }) {
  return (
    <div style={{ flex: '0 1 220px' }}>
      <Select
        options={options}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
      />
    </div>
  )
}

/** "To do" tab: N5 tasks, actions on each card (N6). */
function TasksTab({ defaultAssignee }) {
  const [status, setStatus] = useState('OPEN')
  const [assignee, setAssignee] = useState(defaultAssignee)
  const [page, setPage] = useState(1)
  const { data, isLoading, isFetching, isError, error, refetch } = useTasks({
    assignee,
    status,
    page,
    pageSize: PAGE_SIZE,
  })
  const items = data?.items || []
  const total = data?.total ?? 0

  return (
    <>
      <div className="row" style={{ gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        <FilterSelect
          options={TASK_STATUS_OPTIONS}
          value={status}
          label="Filter to-dos by status"
          onChange={(v) => {
            setStatus(v)
            setPage(1)
          }}
        />
        <FilterSelect
          options={ASSIGNEE_OPTIONS}
          value={assignee}
          label="Whose to-dos"
          onChange={(v) => {
            setAssignee(v)
            setPage(1)
          }}
        />
        <span className="small muted">
          {isLoading ? '…' : `${data?.open_count ?? 0} open · ${total} shown`}
        </span>
      </div>

      {isLoading && <div className="small muted">Loading to-dos…</div>}
      {isError && <ErrorBox message={error?.message} onRetry={refetch} />}
      {!isLoading && !isError && items.length === 0 && (
        <Note>
          {status === 'OPEN'
            ? 'Nothing to do. When the claims desk sends a claim back, each thing to fix appears here: documents and re-scans for medical records, confirmations for doctors.'
            : 'No to-dos match this filter.'}
        </Note>
      )}

      {items.map((task) => (
        <TaskCard key={task.task_id} task={task} />
      ))}

      <Pager page={page} total={total} isFetching={isFetching} onChange={setPage} noun="to-dos" />
    </>
  )
}

/** "Sent-back claims" tab: the gap-report inbox with "x of y done". */
function ReportsTab() {
  const [status, setStatus] = useState('AVAILABLE')
  const [page, setPage] = useState(1)
  const { data, isLoading, isFetching, isError, error, refetch } = useGapInbox({
    status,
    page,
    pageSize: PAGE_SIZE,
  })
  const items = data?.items || []
  const total = data?.total ?? 0

  return (
    <>
      <div className="row" style={{ gap: '8px', alignItems: 'center' }}>
        <FilterSelect
          options={REPORT_STATUS_OPTIONS}
          value={status}
          label="Filter reports"
          onChange={(v) => {
            setStatus(v)
            setPage(1)
          }}
        />
        <span className="small muted">
          {isLoading ? '…' : `${total} ${total === 1 ? 'report' : 'reports'}`}
        </span>
      </div>

      {isLoading && <div className="small muted">Loading reports…</div>}
      {isError && <ErrorBox message={error?.message} onRetry={refetch} />}
      {!isLoading && !isError && items.length === 0 && (
        <Note>
          No sent-back claims here. If you expected one, ask an admin to check that your patients
          are granted to you.
        </Note>
      )}

      {items.map((report) => (
        <GapReportCard key={report.gap_report_id} report={report} />
      ))}

      <Pager page={page} total={total} isFetching={isFetching} onChange={setPage} noun="reports" />
    </>
  )
}

const TABS = [
  { key: 'tasks', label: 'To do' },
  { key: 'reports', label: 'Sent-back claims' },
]

/** S08 My to-dos: the hospital's to-dos (N5–N7) and the claims they belong to. */
export function MyTodosPage() {
  useDocumentTitle('My to-dos')
  const { isAdmin } = useSession()
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'reports' ? 'reports' : 'tasks'

  return (
    <div className="cols">
      <CardPad className="main stack">
        <div className="between">
          <h2 style={{ fontSize: '18px' }}>My to-dos</h2>
          <span className="small muted">What the claims desk needs from the hospital</span>
        </div>

        <div className="row" role="tablist" style={{ gap: '6px' }}>
          {TABS.map((t) => (
            <Button
              key={t.key}
              size="sm"
              role="tab"
              aria-selected={tab === t.key}
              variant={tab === t.key ? 'pri' : undefined}
              onClick={() => setParams(t.key === 'tasks' ? {} : { tab: t.key }, { replace: true })}
            >
              {t.label}
            </Button>
          ))}
        </div>

        {tab === 'tasks' ? <TasksTab defaultAssignee={isAdmin ? 'all' : 'me'} /> : <ReportsTab />}
      </CardPad>

      <aside className="rail">
        <ApiRail title="to-dos" apis={MY_TODOS_APIS} />
        <ActivityRail />
      </aside>
    </div>
  )
}
