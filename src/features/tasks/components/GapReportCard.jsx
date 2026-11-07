import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Chip, ErrorBox } from '@/components/ui'
import { formatTableDate } from '@/utils/formatters'
import { getTaskType } from '../constants'
import { useGapReport } from '../hooks/useGapInbox'

const STATUS_CHIP = {
  AVAILABLE: { label: 'TO FIX', tone: 'amb' },
  GENERATING: { label: 'PREPARING', tone: 'teal' },
  RESOLVED: { label: 'RESOLVED', tone: 'ok' },
  REVOKED: { label: 'WITHDRAWN', tone: 'grey' },
  FAILED: { label: 'FAILED', tone: 'red' },
}

const humanize = (key) => String(key).replace(/[_-]+/g, ' ').toLowerCase()

/**
 * One gap report sent back by the claims desk (S03.6 "Send back to the hospital").
 * Send back creates one to-do per fixable gap (backend 49913f8); the report shows how many are done and
 * becomes RESOLVED when the last one is. The to-dos themselves are worked on in the "To do" tab.
 * Download stays off: POST /gap-reports/{id}/links still needs a user-bound API key
 * (signed-in users get 403 GAP_REPORT_USER_KEY_REQUIRED).
 */
export function GapReportCard({ report }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const detailQuery = useGapReport(report.gap_report_id, open)

  const chip = STATUS_CHIP[report.status] || { label: report.status, tone: 'grey' }
  const patientId = report.user_ids?.[0]
  const summary = Object.entries(detailQuery.data?.gap_summary || {}).filter(
    ([, count]) => count > 0,
  )
  const tasks = detailQuery.data?.tasks || []
  const taskCount = report.task_count ?? 0
  const doneCount = taskCount - (report.open_task_count ?? 0)
  const resolved = report.status === 'RESOLVED'

  return (
    <div
      style={{
        border: '1px solid var(--line)',
        borderRadius: '8px',
        padding: '14px 16px',
        background: 'var(--panel)',
        display: 'grid',
        gap: '8px',
      }}
    >
      <div className="between" style={{ alignItems: 'center', gap: '8px' }}>
        <b style={{ fontSize: '15px' }}>
          {report.patient_name || patientId || 'Patient'}
          {report.claim_id && (
            <span className="mono muted" style={{ fontSize: '12.5px', fontWeight: 400 }}>
              {' '}
              · {report.claim_id}
            </span>
          )}
        </b>
        <Chip tone={chip.tone}>{chip.label}</Chip>
      </div>

      <div className="small">
        The claims desk sent this claim back: <b>{report.gap_count}</b>{' '}
        {report.gap_count === 1 ? 'item' : 'items'} to fix
        {report.hard_rejection_count > 0 && (
          <span style={{ color: 'var(--red)' }}>
            {' '}
            ({report.hard_rejection_count} would get the claim rejected)
          </span>
        )}
        .{' '}
        {resolved
          ? 'Every to-do is done; the claims desk can re-check the claim.'
          : report.resubmission_allowed
            ? 'Fix them and the claim can be submitted again.'
            : 'The hospital can’t fix this one: the claim cannot be resubmitted as is.'}
      </div>

      {taskCount > 0 && (
        <div className="small">
          To-dos:{' '}
          <b>
            {doneCount} of {taskCount} done
          </b>
          <div
            aria-hidden="true"
            style={{
              height: '6px',
              borderRadius: '3px',
              background: 'var(--line)',
              marginTop: '4px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${Math.round((doneCount * 100) / taskCount)}%`,
                height: '100%',
                background: 'var(--ok)',
              }}
            />
          </div>
        </div>
      )}

      <div className="small muted">
        Sent {formatTableDate(report.available_at || report.created_at)}
        {patientId ? ` · patient ${patientId}` : ''}
        {report.encounter_id ? ` · encounter ${report.encounter_id}` : ''}
      </div>

      {open && (
        <div className="small" style={{ display: 'grid', gap: '4px' }}>
          {detailQuery.isLoading && <span className="muted">Loading the report…</span>}
          {detailQuery.isError && (
            <ErrorBox message={detailQuery.error?.message} onRetry={detailQuery.refetch} />
          )}
          {detailQuery.isSuccess &&
            (summary.length > 0 ? (
              <ul style={{ margin: 0, paddingLeft: '18px' }}>
                {summary.map(([key, count]) => (
                  <li key={key}>
                    {humanize(key)}: <b>{count}</b>
                  </li>
                ))}
              </ul>
            ) : (
              <span className="muted">No breakdown for this report.</span>
            ))}
          {detailQuery.isSuccess && tasks.length > 0 && (
            <ul style={{ margin: 0, paddingLeft: '18px' }}>
              {tasks.map((t) => (
                <li key={t.task_id}>
                  <span className="muted">{getTaskType(t.type).chip.toLowerCase()}:</span> {t.title}{' '}
                  —{' '}
                  {t.status === 'DONE' ? (
                    <span style={{ color: 'var(--ok)' }}>
                      done{t.resolved_by ? ` by ${t.resolved_by}` : ''}
                      {t.resolved_at ? `, ${formatTableDate(t.resolved_at)}` : ''}
                    </span>
                  ) : (
                    <b>{t.status === 'OPEN' ? 'open' : t.status.toLowerCase()}</b>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="row" style={{ gap: '8px' }}>
        <Button size="sm" onClick={() => setOpen((v) => !v)}>
          {open ? 'Hide details' : 'Show details'}
        </Button>
        {patientId && (
          <Button
            size="sm"
            onClick={() => navigate(`/documents?patient=${encodeURIComponent(patientId)}`)}
          >
            Open documents →
          </Button>
        )}
        <Button size="sm" disabled title="Download is not available for signed-in users yet">
          Download report
        </Button>
      </div>
    </div>
  )
}
