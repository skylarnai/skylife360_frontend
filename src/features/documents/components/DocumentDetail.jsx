import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Highlight } from '@/components/common'
import { Button, Chip, CardPad, ErrorBox, Kv, Lbl } from '@/components/ui'
import { env } from '@/config/env'
import { PERMISSIONS } from '@/constants/permissions'
import { getDocTypeLabel, getFileStatusInfo } from '@/constants/statusMaps'
import { useCreateTask } from '@/features/tasks/hooks/useTasks'
import { useActivity } from '@/hooks/useActivity'
import { usePermission } from '@/hooks/usePermission'
import { formatTableDate } from '@/utils/formatters'
import { useDocumentText } from '../hooks/useDocuments'

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
  const { log } = useActivity()
  const canRequestRescan = usePermission([PERMISSIONS.FILES_UPLOAD, PERMISSIONS.TASKS_RESOLVE])
  const createTask = useCreateTask()

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

  const requestRescan = () => {
    createTask.mutate(
      {
        type: 'RESCAN',
        title: `${file.original_filename} couldn’t be read`,
        description: 'The scan was too blurry to read. Re-scan it and upload it again.',
        user_id: file.user_id,
        claim_id: patient?.claim_id || null,
        source: {
          file_id: file.file_id,
          original_filename: file.original_filename,
          page_number: null,
        },
        assignee_role: 'RECORDS_STAFF',
      },
      {
        onSuccess: () => {
          log(`requested a re-scan of ${file.original_filename}`)
          toast.success('Re-scan requested from medical records')
        },
        onError: (err) => toast.error(err?.message || 'Could not request a re-scan'),
      },
    )
  }

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

      {failed && canRequestRescan && (
        <div className="row">
          <Button size="sm" variant="warn" loading={createTask.isPending} onClick={requestRescan}>
            Ask records to re-scan
          </Button>
        </div>
      )}

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
