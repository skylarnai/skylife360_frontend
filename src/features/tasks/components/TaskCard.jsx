import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Chip, Select, TextArea } from '@/components/ui'
import { PERMISSIONS } from '@/constants/permissions'
import { useDocuments } from '@/features/documents/hooks/useDocuments'
import { useUploadBatch } from '@/features/ingestion/hooks/useUploadBatch'
import { useActivity } from '@/hooks/useActivity'
import { usePermission } from '@/hooks/usePermission'
import { formatTableDate } from '@/utils/formatters'
import { assigneeLabel, getTaskType, resolveErrorMessage } from '../constants'
import { useResolveTask } from '../hooks/useTasks'

/** The patient's files uploaded after the task was created (the only ones the backend accepts). */
function FilePicker({ task, value, onChange, enabled }) {
  const canUpload = usePermission(PERMISSIONS.FILES_UPLOAD)
  const inputRef = useRef(null)
  const upload = useUploadBatch()
  // Same rule as POST /tasks/{id}/resolve: this patient's files uploaded after the task was created.
  const { data, isLoading } = useDocuments(
    { patient: task.user_id, uploaded_after: task.created_at, limit: 50 },
    { enabled },
  )
  const candidates = data?.items || []

  const handleFiles = (event) => {
    const files = Array.from(event.target.files || [])
    event.target.value = ''
    if (files.length === 0) return
    upload.startNewUpload()
    upload.mutate(
      { files, userId: task.user_id, claimId: task.claim_id || undefined },
      {
        onSuccess: (result) => {
          const first = result?.files?.find((f) => !f.is_archive) || result?.files?.[0]
          if (first?.file_id) onChange(first.file_id)
        },
      },
    )
  }

  const uploaded = upload.data?.files || []
  const options = [
    { value: '', label: isLoading ? 'Loading files…' : 'Choose the new file' },
    ...uploaded
      .filter((f) => !candidates.some((c) => c.file_id === f.file_id))
      .map((f) => ({ value: f.file_id, label: `${f.original_filename} (just uploaded)` })),
    ...candidates.map((f) => ({
      value: f.file_id,
      label: `${f.original_filename} · ${formatTableDate(f.uploaded_at)}`,
    })),
  ]

  return (
    <div style={{ display: 'grid', gap: '6px' }}>
      <div className="row" style={{ gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 240px', minWidth: 0 }}>
          <Select
            options={options}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-label="File that fixes this to-do"
          />
        </div>
        {canUpload && (
          <>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg,.tif,.tiff,.zip"
              style={{ display: 'none' }}
              onChange={handleFiles}
            />
            <Button size="sm" disabled={upload.isPending} onClick={() => inputRef.current?.click()}>
              {upload.isPending ? `Uploading… ${upload.progress}%` : 'Upload a file'}
            </Button>
          </>
        )}
      </div>
      {upload.isError && (
        <span className="small" style={{ color: 'var(--red)' }}>
          Upload failed: {upload.error?.message}
        </span>
      )}
      {upload.isSuccess && uploaded.some((f) => f.duplicate_of_file_id) && (
        <span className="small muted">
          This file was uploaded before. If it’s the old scan, upload the new one instead.
        </span>
      )}
      {!canUpload && candidates.length === 0 && !isLoading && (
        <span className="small muted">
          No new files for this patient yet. Ask medical records to upload it.
        </span>
      )}
    </div>
  )
}

/**
 * One to-do (N5). Actions call N6 resolve; the body depends on the type:
 * DOCUMENT needs a file (this patient's, uploaded after the task), PAYER_QUERY needs a reply.
 */
export function TaskCard({ task }) {
  const navigate = useNavigate()
  const { log } = useActivity()
  const canResolve = usePermission(PERMISSIONS.TASKS_RESOLVE)
  const resolve = useResolveTask()
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState('')
  const [reply, setReply] = useState('')
  const [fileId, setFileId] = useState('')

  const info = getTaskType(task.type)
  const done = task.status === 'DONE'
  const cancelled = task.status === 'CANCELLED'
  const missing = (info.needsReply && !reply.trim()) || (info.needsFile && !fileId)

  const submit = () => {
    resolve.mutate(
      {
        taskId: task.task_id,
        note: note.trim() || undefined,
        reply: reply.trim() || undefined,
        fileId: fileId || undefined,
      },
      {
        onSuccess: () => {
          log(`completed: ${task.title}`)
          setOpen(false)
        },
      },
    )
  }

  return (
    <div
      style={{
        border: '1px solid var(--line)',
        borderRadius: '8px',
        padding: '14px 16px',
        background: 'var(--panel)',
        display: 'grid',
        gap: '8px',
        opacity: done || cancelled ? 0.65 : 1,
      }}
    >
      <div className="between" style={{ alignItems: 'flex-start', gap: '8px' }}>
        <b style={{ fontSize: '15px', minWidth: 0, overflowWrap: 'anywhere' }}>{task.title}</b>
        <div className="row" style={{ gap: '6px', flexShrink: 0 }}>
          <Chip tone={info.tone}>{info.chip}</Chip>
          {done && <Chip tone="ok">DONE</Chip>}
          {cancelled && <Chip tone="grey">CANCELLED</Chip>}
        </div>
      </div>

      {task.detail && <div className="small">{task.detail}</div>}

      <div className="small muted">
        {task.patient_name || task.user_id}
        {task.patient_name ? ` · ${task.user_id}` : ''}
        {task.claim_id ? ` · claim ${task.claim_id}` : ''}
        {task.document?.filename
          ? ` · about ${task.document.filename}${task.document.page ? `, page ${task.document.page}` : ''}`
          : ''}
      </div>
      <div className="small muted">
        For {assigneeLabel(task.assignee)} · from {task.created_by || 'the claims desk'},{' '}
        {formatTableDate(task.created_at)}
      </div>

      {done && (
        <div className="small">
          Done by <b>{task.resolved_by || 'someone'}</b> at {formatTableDate(task.resolved_at)}
          {task.reply && <div>Reply: {task.reply}</div>}
          {task.note && <div className="muted">Note: {task.note}</div>}
        </div>
      )}

      {open && !done && (
        <div style={{ display: 'grid', gap: '8px' }}>
          {info.pickFile && (
            <FilePicker task={task} value={fileId} onChange={setFileId} enabled={open} />
          )}
          {info.needsReply && (
            <TextArea
              rows={4}
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Your reply to the insurer’s question"
              maxLength={10000}
            />
          )}
          <TextArea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note for the claims desk (optional)"
            maxLength={2000}
          />
          {resolve.isError && (
            <span className="small" style={{ color: 'var(--red)' }}>
              {resolveErrorMessage(resolve.error)}
            </span>
          )}
        </div>
      )}

      <div className="row" style={{ gap: '8px', flexWrap: 'wrap' }}>
        {!done && !cancelled && canResolve && !open && (
          <Button size="sm" variant="pri" onClick={() => setOpen(true)}>
            {info.action}
          </Button>
        )}
        {open && !done && (
          <>
            <Button
              size="sm"
              variant="pri"
              disabled={missing || resolve.isPending}
              onClick={submit}
            >
              {resolve.isPending ? 'Saving…' : info.action}
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setOpen(false)
                resolve.reset()
              }}
            >
              Cancel
            </Button>
          </>
        )}
        <Button
          size="sm"
          onClick={() =>
            navigate(
              `/documents?patient=${encodeURIComponent(task.user_id)}${
                task.document?.file_id ? `&file=${encodeURIComponent(task.document.file_id)}` : ''
              }`,
            )
          }
        >
          Open documents →
        </Button>
      </div>
    </div>
  )
}
