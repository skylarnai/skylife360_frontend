import { useMemo } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { ApiRail } from '@/components/dev/ApiRail'
import { PATIENT_SUMMARY_APIS } from '@/constants/doctorFlowApis'
import { MaskedDataNote } from '@/components/common'
import { CardPad, Chip, ErrorBox, Lbl, Note } from '@/components/ui'
import { getClaimStageInfo, getFileStatusInfo } from '@/constants/statusMaps'
import { useDocuments } from '@/features/documents/hooks/useDocuments'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { formatShortDate } from '@/utils/formatters'
import { PatientPicker } from '../components/PatientPicker'
import { usePatient, usePatients } from '../hooks/usePatients'
import { diagnosisLabel, patientErrorMessage } from '../utils'

const PATIENT_FIRST = 'first'

const docLink = (file) =>
  `/documents?patient=${encodeURIComponent(file.user_id)}&file=${encodeURIComponent(file.file_id)}`

function PatientHeader({ patient }) {
  const stage = patient.claim_stage ? getClaimStageInfo(patient.claim_stage) : null
  return (
    <div>
      <div className="mono small" style={{ color: 'var(--accent)' }}>
        {[patient.user_id, patient.name, patient.sex, patient.age].filter(Boolean).join(' · ')}
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
              to={docLink(f)}
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
  const {
    data: listData,
    isLoading: listLoading,
    isError: listError,
    error: listErr,
  } = usePatients()
  const patients = useMemo(() => listData?.patients || [], [listData])
  // The tab opens /patients/first: redirect to the first patient in the caller's list.
  const isFirst = patientId === PATIENT_FIRST
  const { data, isLoading, isError, error, refetch } = usePatient(isFirst ? null : patientId)
  const patient = data?.patient

  if (isFirst) {
    if (patients.length > 0) {
      return <Navigate to={`/patients/${encodeURIComponent(patients[0].user_id)}`} replace />
    }
    if (listError) {
      return (
        <CardPad>
          <ErrorBox message={listErr?.message} />
        </CardPad>
      )
    }
    return (
      <CardPad className="muted">
        {listLoading
          ? 'Loading your patients…'
          : 'No patients yet. Doctors see only the patients an admin has granted to them.'}
      </CardPad>
    )
  }

  return (
    <div className="cols">
      <CardPad className="main stack">
        <div className="between">
          <h2 style={{ fontSize: '18px' }}>Patient summary</h2>
          <MaskedDataNote />
          <PatientPicker
            patients={patients}
            value={patientId}
            className="min-w-[220px]"
            onChange={(id) => navigate(`/patients/${encodeURIComponent(id)}`)}
          />
        </div>

        {isLoading && <div className="small muted">Loading patient…</div>}
        {isError &&
          ([403, 404].includes(error?.status) ? (
            <Note>{patientErrorMessage(error)}</Note>
          ) : (
            <ErrorBox message={patientErrorMessage(error)} onRetry={refetch} />
          ))}
        {!isLoading && !isError && !patient && (
          <div className="muted">
            This patient isn’t in your list. Pick one of your patients above.
          </div>
        )}

        {patient && (
          <>
            <PatientHeader patient={patient} />
            {/* Dated timeline (N4) needs the extraction models: not in this phase. */}
            <div className="small muted">
              Open the documents on the right to read the notes, reports and discharge summary.
            </div>
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
