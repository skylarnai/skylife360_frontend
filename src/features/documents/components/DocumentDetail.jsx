import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Highlight } from '@/components/common'
import { Button, Chip, CardPad, ErrorBox, Kv, Lbl, TextInput } from '@/components/ui'
import { env } from '@/config/env'
import { PERMISSIONS } from '@/constants/permissions'
import { getDocTypeLabel, getFileStatusInfo } from '@/constants/statusMaps'
import { usePermission } from '@/hooks/usePermission'
import { formatTableDate } from '@/utils/formatters'
import { useCreateTask } from '@/features/tasks/hooks/useTasks'
import { useActivity } from '@/hooks/useActivity'
import { useDocumentText } from '../hooks/useDocuments'

/** N7: ask medical records to re-scan this file (a RESCAN to-do for the records staff pool). */
function RequestRescan({ file }) {
  const { log } = useActivity()
  const create = useCreateTask()
  const [open, setOpen] = useState(false)
  const [page, setPage] = useState('')
  const [reason, setReason] = useState('')

  // A file that already has an open re-scan returns that task (200), so a repeat is harmless.
  if (create.isSuccess) {
    return (
      <div className="small" style={{ color: 'var(--ok)' }}>
        Re-scan requested ({create.data?.title}). Medical records will see it in their to-dos.
      </div>
    )
  }

  if (!open) {
    return (
      <div className="row">
        <Button size="sm" onClick={() => setOpen(true)}>
          Request re-scan
        </Button>
      </div>
    )
  }

  const pageNumber = Number.parseInt(page, 10)
  const validPage = Number.isFinite(pageNumber) && pageNumber >= 1 ? pageNumber : undefined
  const submit = () => {
    const title = `Re-scan ${file.original_filename}${validPage ? `, page ${validPage}` : ''}`
    create.mutate(
      {
        type: 'RESCAN',
        userId: file.user_id,
        claimId: file.claim_id || undefined,
        title: title.slice(0, 200),
        detail: reason.trim() || undefined,
        fileId: file.file_id,
        page: validPage,
      },
      { onSuccess: () => log(`requested re-scan: ${file.original_filename}`) },
    )
  }

  return (
    <div style={{ display: 'grid', gap: '6px' }}>
      <Lbl>Request re-scan</Lbl>
      <div className="row" style={{ gap: '8px', flexWrap: 'wrap' }}>
        <div style={{ flex: '0 0 110px' }}>
          <TextInput
            type="number"
            min={1}
            value={page}
            onChange={(e) => setPage(e.target.value)}
            placeholder="Page (all)"
            aria-label="Page to re-scan"
          />
        </div>
        <div style={{ flex: '1 1 200px' }}>
          <TextInput
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why, e.g. page is blurred"
            maxLength={2000}
            aria-label="Reason"
          />
        </div>
      </div>
      {create.isError && (
        <span className="small" style={{ color: 'var(--red)' }}>
          {create.error?.message || 'Could not request the re-scan.'}
        </span>
      )}
      <div className="row" style={{ gap: '8px' }}>
        <Button size="sm" variant="pri" disabled={create.isPending} onClick={submit}>
          {create.isPending ? 'Sending…' : 'Send to medical records'}
        </Button>
        <Button size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

function DocumentText({ fileId, query }) {
  const { data, isLoading, isError, error, refetch } = useDocumentText(fileId)
  if (isLoading) return <div className="small muted">Loading text…</div>
  if (isError) return <ErrorBox message={error?.message} onRetry={refetch} />
  const pages = data?.pages || []
  if (pages.length === 0)
    return <div className="small muted">No text was read from this document.</div>
  return (
    <>
      <Lbl>Text from this document</Lbl>
      {pages.map((p, i) => (
        <div className="snip" key={`${p.page_number}-${i}`}>
          <div className="small muted">
            Page {p.page_number}
            {p.heading ? ` · ${p.heading}` : ''}
          </div>
          <span style={{ whiteSpace: 'pre-wrap' }}>
            <Highlight text={p.text} query={query} />
          </span>
        </div>
      ))}
    </>
  )
}

export function DocumentDetail({ file, patient, query }) {
  const navigate = useNavigate()
  const canRequestRescan = usePermission([PERMISSIONS.TASKS_RESOLVE, PERMISSIONS.CLAIMS_APPROVE])

  if (!file) {
    return (
      <CardPad className="stack">
        <Lbl>Document</Lbl>
        <div className="muted small">
          Select a document to see its details and the text read from it.
        </div>
      </CardPad>
    )
  }

  const status = getFileStatusInfo(file.status)
  const failed = file.status === 'EXTRACTION_FAILED'
  const ready = file.status === 'INDEXED'
  const detail =
    file.detail ||
    (file.status === 'DUPLICATE' && file.duplicate_of_filename
      ? `Same file as ${file.duplicate_of_filename}, not stored twice`
      : null)

  return (
    <CardPad className="stack">
      <div className="between">
        <Lbl>Document</Lbl>
        <Chip tone={status.tone}>{status.label}</Chip>
      </div>
      <div>
        <b style={{ font: '700 16px var(--f-display)', overflowWrap: 'anywhere' }}>
          {file.original_filename}
        </b>
        <div className="small muted">
          {[file.user_id, patient?.sex, patient?.age, patient?.procedure_name]
            .filter(Boolean)
            .join(' · ')}
        </div>
      </div>
      {detail && (
        <div className="small" style={{ color: failed ? 'var(--red)' : 'var(--muted)' }}>
          {detail}
        </div>
      )}
      <div style={{ display: 'grid', gap: '4px' }}>
        <Kv label="Type" value={getDocTypeLabel(file.classification_type)} />
        <Kv label="Pages" value={file.total_pages ?? '—'} />
        <Kv label="Scanned image" value={file.has_ocr ? 'Yes' : 'No'} />
        <Kv
          label="Uploaded"
          value={`${formatTableDate(file.uploaded_at)}${file.uploaded_by ? ` by ${file.uploaded_by}` : ''}`}
        />
        {patient?.claim_stage && <Kv label="Claim stage" value={patient.claim_stage} />}
      </div>

      {ready && <DocumentText fileId={file.file_id} query={query} />}

      {env.showApiPanel && (
        <div className="mono small muted">
          file_id {file.file_id}
          {file.chunk_count !== undefined ? ` · ${file.chunk_count} chunks` : ''} · status{' '}
          {file.status}
        </div>
      )}

      {failed && (
        <div className="small muted">
          This document couldn’t be read. Request a re-scan so medical records upload a clearer
          copy.
        </div>
      )}

      {canRequestRescan && <RequestRescan key={file.file_id} file={file} />}

      {ready && (
        <div className="row">
          {env.enableAsk && (
            <Button
              size="sm"
              variant="pri"
              onClick={() => navigate(`/ask?patient=${encodeURIComponent(file.user_id)}`)}
            >
              Ask about this patient →
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => navigate(`/patients/${encodeURIComponent(file.user_id)}`)}
          >
            Patient summary
          </Button>
        </div>
      )}
    </CardPad>
  )
}
