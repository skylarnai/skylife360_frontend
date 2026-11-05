import { ApiRail } from '@/components/dev/ApiRail'
import { MY_TODOS_APIS } from '@/constants/doctorFlowApis'
import { ActivityRail, DemoDataNote } from '@/components/common'
import { CardPad, ErrorBox, Pill } from '@/components/ui'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { TaskCard } from '../components/TaskCard'
import { useTasks } from '../hooks/useTasks'

export function MyTodosPage() {
  useDocumentTitle('My to-dos')
  const { data, isLoading, isError, error, refetch } = useTasks()
  const items = data?.items || []
  const open = items.filter((t) => t.status === 'OPEN').length

  return (
    <div className="cols">
      <CardPad className="main stack">
        <div className="between">
          <h2 style={{ fontSize: '18px' }}>My to-dos</h2>
          <span className="small muted">Requests from the claims team and insurers</span>
        </div>

        {data?.source === 'mock' && <DemoDataNote what="to-dos" endpoint="GET /api/v1/tasks" />}

        <div className="row" style={{ gap: '6px' }}>
          <Pill tone="amb">{open} to do</Pill>
          <Pill tone="ok">{items.length - open} done</Pill>
        </div>

        {isLoading && <div className="small muted">Loading to-dos…</div>}
        {isError && <ErrorBox message={error?.message} onRetry={refetch} />}
        {!isLoading && !isError && items.length === 0 && (
          <div className="muted">
            Nothing to do. New requests from the claims team will appear here.
          </div>
        )}

        {items.map((task) => (
          <TaskCard key={task.task_id} task={task} />
        ))}
      </CardPad>

      <aside className="rail">
        <ApiRail title="to-dos" apis={MY_TODOS_APIS} />
        <ActivityRail />
      </aside>
    </div>
  )
}
