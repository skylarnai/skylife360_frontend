import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ApiRail } from '@/components/dev/ApiRail'
import { PATIENT_DOCUMENTS_APIS } from '@/constants/doctorFlowApis'
import { ActivityRail, DemoDataNote } from '@/components/common'
import { ErrorBox, SearchInput, Select, Tile, TileGrid } from '@/components/ui'
import { DOC_TYPE_MAP } from '@/constants/statusMaps'
import { usePatients } from '@/features/patients/hooks/usePatients'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useSession } from '@/hooks/useSession'
import { DocumentDetail } from '../components/DocumentDetail'
import { DocumentsTable } from '../components/DocumentsTable'
import { useDocuments, useDocumentSearch } from '../hooks/useDocuments'

const QUICK_SEARCHES = ['signature', 'histopathology', 'troponin']
const TYPE_OPTIONS = [
  { value: 'all', label: 'All types' },
  ...['admission', 'lab', 'operative', 'discharge'].map((t) => ({
    value: t,
    label: DOC_TYPE_MAP[t],
  })),
]
const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'INDEXED', label: 'Ready' },
  { value: 'EXTRACTION_FAILED', label: 'Couldn’t read' },
  { value: 'DUPLICATE', label: 'Duplicate copy' },
]

/** Best place inside the document that matches `q`: a local passage (mock text) or a rag/search hit. */
function findMatch(file, q, ragHits) {
  if (!q) return { ok: true, hit: null }
  const ql = q.toLowerCase()
  const local = (file.passages || []).find((p) =>
    `${p.heading} ${p.content}`.toLowerCase().includes(ql),
  )
  if (local)
    return {
      ok: true,
      hit: { page_number: local.page_number, heading: local.heading, content: local.content },
    }
  const rag = ragHits?.get(file.file_id)
  if (rag) {
    return {
      ok: true,
      hit: { page_number: rag.page_number, heading: rag.heading_path, content: rag.content },
    }
  }
  const meta = [file.original_filename, file.user_id, file.classification_type, file.procedure_name]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return { ok: meta.includes(ql), hit: null }
}

export function PatientDocumentsPage() {
  useDocumentTitle('Patient documents')
  const { isAdmin } = useSession()
  const [params, setParams] = useSearchParams()
  const q = params.get('q') || ''
  const patient = params.get('patient') || 'all'
  const type = params.get('type') || 'all'
  const status = params.get('status') || 'all'
  const selectedId = params.get('file')

  const debouncedQ = useDebouncedValue(q.trim(), 300)
  const { data: patientsData } = usePatients()
  const patients = useMemo(() => patientsData?.patients || [], [patientsData])
  const { data, isLoading, isError, error, refetch } = useDocuments({ patient, type, status })
  const { data: ragHits } = useDocumentSearch(debouncedQ, patient)

  const setParam = (key, value) => {
    const next = new URLSearchParams(params)
    if (!value || value === 'all') next.delete(key)
    else next.set(key, value)
    setParams(next, { replace: true })
  }

  const patientById = useMemo(() => new Map(patients.map((p) => [p.user_id, p])), [patients])

  const rows = useMemo(() => {
    const items = data?.items || []
    return items
      .map((f) => ({ ...f, procedure_name: patientById.get(f.user_id)?.procedure_name }))
      .map((f) => ({ ...f, match: findMatch(f, debouncedQ, ragHits) }))
      .filter((f) => f.match.ok)
  }, [data, patientById, debouncedQ, ragHits])

  const allItems = data?.items || []
  const selected = allItems.find((f) => f.file_id === selectedId) || null
  const counts = data?.counts || {}

  return (
    <div className="stack">
      <div className="between">
        <h2 style={{ fontSize: '20px' }}>Patient documents</h2>
        <span className="small muted">{isAdmin ? 'Whole hospital' : 'Your patients only'}</span>
      </div>

      <TileGrid>
        <Tile label="documents" value={counts.documents ?? allItems.length} />
        <Tile label="ready to search" value={counts.ready ?? '—'} />
        <Tile label="couldn’t be read" value={counts.failed ?? '—'} />
        <Tile label="patients" value={counts.patients ?? patients.length} />
      </TileGrid>

      {data?.source === 'mock' && <DemoDataNote what="documents" endpoint="GET /api/v1/files" />}

      <div className="cols">
        <div className="main stack">
          <div
            className="card pad"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
              gap: '10px',
            }}
          >
            <SearchInput
              label="Search documents by name, patient or anything written in them"
              className="col-span-full"
              placeholder="e.g. signature, troponin, SYN-P-1103, cataract"
              value={q}
              onChange={(e) => setParam('q', e.target.value)}
            />
            <Select
              label="Patient"
              value={patient}
              onChange={(e) => setParam('patient', e.target.value)}
              options={[
                { value: 'all', label: 'All patients' },
                ...patients.map((p) => ({
                  value: p.user_id,
                  label: `${p.user_id} · ${p.procedure_name || ''}`,
                })),
              ]}
            />
            <Select
              label="Document type"
              value={type}
              onChange={(e) => setParam('type', e.target.value)}
              options={TYPE_OPTIONS}
            />
            <Select
              label="Status"
              value={status}
              onChange={(e) => setParam('status', e.target.value)}
              options={STATUS_OPTIONS}
            />
            <div className="row" style={{ gap: '6px', alignSelf: 'end' }}>
              <span className="small muted">Try:</span>
              {QUICK_SEARCHES.map((t) => (
                <button
                  key={t}
                  type="button"
                  className="qbtn"
                  style={{ minHeight: '36px', padding: '4px 10px', fontSize: '13px' }}
                  onClick={() => setParam('q', t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {isError ? (
            <ErrorBox message={error?.message} onRetry={refetch} />
          ) : (
            <DocumentsTable
              rows={rows}
              total={allItems.length}
              loading={isLoading}
              query={debouncedQ}
              selectedId={selectedId}
              onSelect={(row) => setParam('file', row.file_id)}
            />
          )}
        </div>

        <aside className="rail">
          <DocumentDetail
            file={selected}
            patient={selected ? patientById.get(selected.user_id) : null}
            query={debouncedQ}
          />
          <ApiRail title="documents" apis={PATIENT_DOCUMENTS_APIS} />
          <ActivityRail />
        </aside>
      </div>
    </div>
  )
}
