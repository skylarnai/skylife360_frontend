import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Button, Chip, TextArea } from '@/components/ui'
import { PERMISSIONS } from '@/constants/permissions'
import { useActivity } from '@/hooks/useActivity'
import { usePermission } from '@/hooks/usePermission'
import { formatTimeNow } from '@/utils/formatters'
import dayjs from 'dayjs'
import { getTaskType } from '../constants'
import { useResolveTask } from '../hooks/useTasks'

function sourceLabel(source) {
  if (!source?.original_filename) return null
  return source.page_number
    ? `${source.original_filename} · page ${source.page_number}`
    : source.original_filename
}

export function TaskCard({ task }) {
  const navigate = useNavigate()
  const { log } = useActivity()
  const canResolve = usePermission(PERMISSIONS.TASKS_RESOLVE)
  const resolve = useResolveTask()
  const type = getTaskType(task.type)
  const done = task.status === 'DONE'
  const isPayerQuery = task.type === 'PAYER_QUERY'
  const [reply, setReply] = useState(task.suggested_reply?.text || '')

  const reference = [task.user_id, task.payer || task.claim_id].filter(Boolean).join(' · ')
  const see = sourceLabel(task.source)

  const onResolve = () => {
    resolve.mutate(
      { taskId: task.task_id, reply: isPayerQuery ? reply.trim() : undefined },
      {
        onSuccess: () => log(`completed: ${task.title}`),
        onError: (err) => toast.error(err?.message || 'Could not update this to-do'),
      },
    )
  }

  return (
    <div className={`task${done ? ' doneT' : ''}`}>
      <div className="between">
        <div className="row" style={{ gap: '8px' }}>
          <Chip tone={done ? 'ok' : type.tone}>{done ? 'DONE' : type.chip}</Chip>
          <b>{task.title}</b>
        </div>
        {reference && <span className="mono small muted">{reference}</span>}
      </div>
      {task.description && <div className="small muted">{task.description}</div>}
      {see && (
        <div className="small" style={{ color: 'var(--teal)' }}>
          See: {see}
        </div>
      )}

      {isPayerQuery && !done && (
        <div className="stack" style={{ gap: '4px' }}>
          <TextArea
            label="Suggested reply (edit before sending)"
            rows={3}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            disabled={!canResolve}
          />
          {task.suggested_reply?.citation && (
            <span className="small">
              <span className="cite">
                [{task.suggested_reply.citation.original_filename}
                {task.suggested_reply.citation.page_number
                  ? `, page ${task.suggested_reply.citation.page_number}`
                  : ''}
                ]
              </span>
            </span>
          )}
        </div>
      )}

      <div className="row">
        {done ? (
          <span className="small" style={{ color: 'var(--ok)' }}>
            Done by {task.resolved_by || 'you'} at{' '}
            {task.resolved_at ? dayjs(task.resolved_at).format('HH:mm') : formatTimeNow()}
          </span>
        ) : (
          <>
            {canResolve && (
              <Button
                size="sm"
                variant="pri"
                loading={resolve.isPending}
                disabled={isPayerQuery && !reply.trim()}
                onClick={onResolve}
              >
                {type.action}
              </Button>
            )}
            {task.source?.file_id && (
              <Button
                size="sm"
                onClick={() =>
                  navigate(`/documents?file=${encodeURIComponent(task.source.file_id)}`)
                }
              >
                Open document
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
