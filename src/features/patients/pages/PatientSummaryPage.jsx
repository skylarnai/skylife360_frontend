import { useMemo } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { ApiRail } from '@/components/dev/ApiRail'
import { PATIENT_SUMMARY_APIS } from '@/constants/doctorFlowApis'
import { DemoDataNote } from '@/components/common'
import { CardPad, Chip, ErrorBox, Lbl } from '@/components/ui'
import { getClaimStageInfo, getFileStatusInfo } from '@/constants/statusMaps'
import { useDocuments } from '@/features/documents/hooks/useDocuments'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { formatShortDate } from '@/utils/formatters'
import { PatientPicker } from '../components/PatientPicker'
import { usePatient, usePatients, usePatientTimeline } from '../hooks/usePatients'
import { diagnosisLabel } from '../utils'

const PATIENT_FIRST = 'first'

const docLink = (fileId) => `/documents?file=${encodeURIComponent(fileId)}`

function PatientHeader({ patient }) {
  const stage = patient.claim_stage ? getClaimStageInfo(patient.claim_stage) : null
  return (
    <div>
      <div className="mono small" style={{ color: 'var(--accent)' }}>
        {[patient.user_id, patient.sex, patient.age].filter(Boolean).join(' · ')}
      </div>
      <h3 style={{ fontSize: '20px', margin: '2px 0' }}>
        {patient.procedure_name || 'Procedure not recorded'}
      </h3>
      <div className="row muted small" style={{ gap: '4px 16px' }}>
        {diagnosisLabel(patient) && <span>{diagnosisLabel(patient)}</span>}
        {patient.treating_doctor && (
          <span>
            Treating doctor <b style={{ color: 'var(--fg)' }}>{patient.treating_doctor}</b>
          </span>
        )}
        <span>
          Admitted {formatShortDate(patient.admission_date)} · Discharged{' '}
          {formatShortDate(patient.discharge_date)}
        </span>
        {stage && (
          <span>
            Claim <Chip tone={stage.tone}>{stage.label}</Chip>
          </span>
        )}
      </div>
    </div>
  )
}

function Timeline({ userId }) {
  const { data, isLoading, isError, error, refetch } = usePatientTimeline(userId)
  if (isLoading) return <div className="small muted">Loading timeline…</div>
  if (isError) return <ErrorBox message={error?.message} onRetry={refetch} />
  const events = data?.events || []
  if (events.length === 0)
    return <div className="small muted">No dated events found in this patient’s documents yet.</div>
  return (
    <ol className="tl">
      {events.map((e, i) => (
        <li key={`${e.date}-${e.title}-${i}`}>
          <time>{formatShortDate(e.date)}</time>
          <span className="dot" />
          <div>
            <b style={{ fontWeight: 600 }}>{e.title}</b>
            {e.text ? ` · ${e.text}` : ''}
            {e.source?.original_filename && (
              <div className="small">
                <Link to={docLink(e.source.file_id)} style={{ color: 'var(--teal)' }}>
                  Source: {e.source.original_filename}
                  {e.source.page_number ? ` · page ${e.source.page_number}` : ''}
                </Link>
              </div>
            )}
          </div>
        </li>
      ))}
    </ol>
  )
}

function PatientDocumentsRail({ userId }) {
  const { data, isLoading } = useDocuments({ patient: userId })
  const files = data?.items || []
  return (
    <CardPad className="stack">
      <Lbl>Documents · {isLoading ? '…' : files.length}</Lbl>
      {files.map((f) => {
        const status = getFileStatusInfo(f.status)
        return (
          <div
            key={f.file_id}
            className="between"
            style={{
              border: '1px solid var(--line)',
              borderRadius: '6px',
              padding: '7px 9px',
              alignItems: 'center',
            }}
          >
            <Link
              className="link"
              to={docLink(f.file_id)}
              style={{ textAlign: 'left', overflowWrap: 'anywhere' }}
            >
              {f.original_filename}
            </Link>
            <Chip tone={status.tone}>{status.label}</Chip>
          </div>
        )
      })}
      <div className="small muted">
        Claim amounts, payer details and integrity findings are not shown to doctors and staff.
      </div>
    </CardPad>
  )
}

export function PatientSummaryPage() {
  useDocumentTitle('Patient summary')
  const { patientId } = useParams()
  const navigate = useNavigate()
  const { data: listData } = usePatients()
  const patients = useMemo(() => listData?.patients || [], [listData])
  // The tab opens /patients/first: redirect to the first patient in the caller's list.
  const isFirst = patientId === PATIENT_FIRST
  const { data, isLoading, isError, error, refetch } = usePatient(isFirst ? null : patientId)
  const patient = data?.patient

  if (isFirst) {
    return patients.length > 0 ? (
      <Navigate to={`/patients/${encodeURIComponent(patients[0].user_id)}`} replace />
    ) : (
      <CardPad className="muted">Loading your patients…</CardPad>
    )
  }

  return (
    <div className="cols">
      <CardPad className="main stack">
        <div className="between">
          <h2 style={{ fontSize: '18px' }}>Patient summary</h2>
          <PatientPicker
            patients={patients}
            value={patientId}
            className="min-w-[220px]"
            onChange={(id) => navigate(`/patients/${encodeURIComponent(id)}`)}
          />
        </div>

        {data?.source === 'mock' && (
          <DemoDataNote what="patient details" endpoint="GET /api/v1/patients/{user_id}" />
        )}

        {isLoading && <div className="small muted">Loading patient…</div>}
        {isError && <ErrorBox message={error?.message} onRetry={refetch} />}
        {!isLoading && !isError && !patient && (
          <div className="muted">
            This patient isn’t in your list. Pick one of your patients above.
          </div>
        )}

        {patient && (
          <>
            <PatientHeader patient={patient} />
            <Lbl>Timeline · from the patient’s documents</Lbl>
            <Timeline userId={patient.user_id} />
          </>
        )}
      </CardPad>

      <aside className="rail">
        {patient && <PatientDocumentsRail userId={patient.user_id} />}
        <ApiRail title="patient" apis={PATIENT_SUMMARY_APIS} />
      </aside>
    </div>
  )
}
