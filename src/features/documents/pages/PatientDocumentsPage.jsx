import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ApiRail } from '@/components/dev/ApiRail'
import { PATIENT_DOCUMENTS_APIS } from '@/constants/doctorFlowApis'
import { ActivityRail, MaskedDataNote } from '@/components/common'
import { ErrorBox, Note, Pagination, SearchInput, Select, Tile, TileGrid } from '@/components/ui'
import { env } from '@/config/env'
import { DOC_TYPE_MAP } from '@/constants/statusMaps'
import { patientLabel } from '@/features/patients/utils'
import { usePatients } from '@/features/patients/hooks/usePatients'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { usePageState } from '@/hooks/usePageState'
import { useSession } from '@/hooks/useSession'
import { DocumentDetail } from '../components/DocumentDetail'
import { DocumentsTable } from '../components/DocumentsTable'
import { useDocuments, useDocumentSearch } from '../hooks/useDocuments'

const PAGE_SIZE = 25
// The table pages on the server; the search box is sent as `q` (file name, patient ID or name,
// type, procedure — backend 203f135). Only when searching inside the text (rag/search, models on)
// are the newest SEARCH_WINDOW files merged with the text hits in the browser.
const SEARCH_WINDOW = 200

// Searching inside the text uses POST /rag/search (embeddings): only when the models are on.
const SEARCH_INSIDE = env.enableAsk
const QUICK_SEARCHES = SEARCH_INSIDE ? ['signature', 'histopathology', 'troponin'] : []
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
  { value: 'PROCESSING', label: 'In progress' },
]

/** Matches `q` against the file's name, patient and type, or a rag/search hit inside its text. */
function findMatch(file, q, ragHits) {
  if (!q) return { ok: true, hit: null }
  const ql = q.toLowerCase()
  const rag = ragHits?.get(file.file_id)
  if (rag) {
    return {
      ok: true,
      hit: { page_number: rag.page_number, heading: rag.heading_path, content: rag.content },
    }
  }
  const meta = [
    file.original_filename,
    file.user_id,
    file.patient_name,
    file.classification_type,
    file.procedure_name,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return { ok: meta.includes(ql), hit: null }
}

export function PatientDocumentsPage() {
  useDocumentTitle('Patient documents')
  const { isScopedToGrants } = useSession()
  const [params, setParams] = useSearchParams()
  const q = params.get('q') || ''
  const patient = params.get('patient') || 'all'
  const type = params.get('type') || 'all'
  const status = params.get('status') || 'all'
  const selectedId = params.get('file')

  const debouncedQ = useDebouncedValue(q.trim(), 300)
  const { data: patientsData } = usePatients()
  const patients = useMemo(() => patientsData?.patients || [], [patientsData])
  const browserSearch = SEARCH_INSIDE && debouncedQ.length > 0
  const [page, setPage] = usePageState([patient, type, status, debouncedQ].join('|'))
  const [lastSelected, setLastSelected] = useState(null)
  const { data, isLoading, isFetching, isError, error, refetch } = useDocuments(
    browserSearch
      ? { patient, type, status, limit: SEARCH_WINDOW }
      : { patient, type, status, q: debouncedQ, limit: PAGE_SIZE, offset: page * PAGE_SIZE },
  )
  const { data: ragHits } = useDocumentSearch(SEARCH_INSIDE ? debouncedQ : '', patient)

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
      .map((f) => {
        const p = patientById.get(f.user_id)
        return { ...f, procedure_name: p?.procedure_name, patient_name: p?.name }
      })
      .map((f) => ({
        ...f,
        // Server search already matched the row; the browser only merges in text hits.
        match: browserSearch ? findMatch(f, debouncedQ, ragHits) : { ok: true, hit: null },
      }))
      .filter((f) => f.match.ok)
  }, [data, patientById, debouncedQ, ragHits, browserSearch])

  const allItems = data?.items || []
  const filteredTotal = data?.total ?? 0
  const pageRows = browserSearch ? rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE) : rows
  const tableTotal = browserSearch ? rows.length : filteredTotal
  // The selected file may be on another page (or come from a link): keep the last copy.
  const selected =
    allItems.find((f) => f.file_id === selectedId) ||
    (lastSelected?.file_id === selectedId ? lastSelected : null)
  const counts = data?.counts || {}
  const tableNote =
    browserSearch && filteredTotal > SEARCH_WINDOW
      ? `Search covers the newest ${SEARCH_WINDOW} of ${filteredTotal} documents. Pick a patient or type to narrow it.`
      : null

  return (
    <div className="stack">
      <div className="between">
        <h2 style={{ fontSize: '20px' }}>Patient documents</h2>
        <span className="small muted">
          {isScopedToGrants ? 'Your patients only' : 'Whole hospital'}
        </span>
      </div>
      <MaskedDataNote />

      <TileGrid>
        <Tile label="documents" value={counts.documents ?? allItems.length} />
        <Tile label="ready to search" value={counts.ready ?? '—'} />
        <Tile label="couldn’t be read" value={counts.failed ?? '—'} />
        <Tile label="patients" value={counts.patients ?? patients.length} />
      </TileGrid>

      {isScopedToGrants && !isLoading && !isError && (counts.documents ?? 0) === 0 && (
        <Note>
          No documents yet. You only see the patients an admin has granted to you. If you expected
          some, ask an admin to grant you your patients.
        </Note>
      )}

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
              label={
                SEARCH_INSIDE
                  ? 'Search documents by name, patient or anything written in them'
                  : 'Search documents by file name, patient or type'
              }
              className="col-span-full"
              placeholder={
                SEARCH_INSIDE
                  ? 'e.g. signature, troponin, SYN-P-1103'
                  : 'e.g. discharge, SYN-P-1103'
              }
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
                  label: patientLabel(p),
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
            {QUICK_SEARCHES.length > 0 && (
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
            )}
          </div>

          {isError ? (
            <ErrorBox message={error?.message} onRetry={refetch} />
          ) : (
            <DocumentsTable
              rows={pageRows}
              loading={isLoading}
              query={debouncedQ}
              selectedId={selectedId}
              note={tableNote}
              onSelect={(row) => {
                setLastSelected(row)
                setParam('file', row.file_id)
              }}
              footer={
                <Pagination
                  page={page}
                  pageSize={PAGE_SIZE}
                  total={tableTotal}
                  disabled={isFetching}
                  onChange={setPage}
                  noun="documents"
                />
              }
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
