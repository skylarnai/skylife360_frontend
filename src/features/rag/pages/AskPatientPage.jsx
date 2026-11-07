import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ApiRail } from '@/components/dev/ApiRail'
import { ASK_PATIENT_APIS } from '@/constants/doctorFlowApis'
import { ActivityRail } from '@/components/common'
import { CardPad, ErrorBox } from '@/components/ui'
import { PatientPicker } from '@/features/patients/components/PatientPicker'
import { usePatients } from '@/features/patients/hooks/usePatients'
import { diagnosisLabel, suggestedQuestionsFor } from '@/features/patients/utils'
import { useActivity } from '@/hooks/useActivity'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { AnswerBox } from '../components/AnswerBox'
import { AnswerCheck } from '../components/AnswerCheck'
import { AskInput } from '../components/AskInput'
import { QuestionChips } from '../components/QuestionChips'
import { SourcesList } from '../components/SourcesList'
import { useAsk } from '../hooks/useAsk'

function PatientQuestions({ patientId, questions }) {
  const { log } = useActivity()
  const [selectedIdx, setSelectedIdx] = useState(null)
  const [activeQuery, setActiveQuery] = useState('')
  const { ask, data, isLoading, isError, error, evaluation, isEvaluating } = useAsk()

  const handleAsk = (text, idx = null) => {
    if (!patientId) return
    setSelectedIdx(idx)
    setActiveQuery(text)
    log(`asked about ${patientId}: ${text}`)
    ask({ query: text, userId: patientId })
  }

  return (
    <>
      <QuestionChips
        questions={questions}
        selectedIndex={selectedIdx}
        onSelect={(idx, text) => handleAsk(text, idx)}
        disabled={isLoading || !patientId}
      />

      <AskInput
        onSubmit={(text) => handleAsk(text)}
        disabled={!patientId}
        loading={isLoading}
        placeholder="Type a question, e.g. Was the histopathology report received?"
      />

      {isError && (
        <ErrorBox
          message={error?.message || 'Could not get an answer for this question.'}
          onRetry={() => activeQuery && handleAsk(activeQuery, selectedIdx)}
        />
      )}

      {isLoading && <AnswerBox loading />}

      {data && !isLoading && (
        <>
          <AnswerBox answer={data.answer} answered={data.answered} citations={data.citations} />
          {data.sources?.length > 0 && (
            <SourcesList sources={data.sources} citations={data.citations} />
          )}
          <AnswerCheck evaluation={evaluation} loading={isEvaluating} />
        </>
      )}
    </>
  )
}

export function AskPatientPage() {
  useDocumentTitle('Ask about a patient')
  const [params, setParams] = useSearchParams()
  const { data: patientsData, isLoading: patientsLoading } = usePatients()
  const patients = useMemo(() => patientsData?.patients || [], [patientsData])

  const patientId = params.get('patient') || patients[0]?.user_id || ''
  const patient = patients.find((p) => p.user_id === patientId)
  const questions = suggestedQuestionsFor(patientId)

  const changePatient = (id) => {
    const next = new URLSearchParams(params)
    next.set('patient', id)
    setParams(next, { replace: true })
  }

  const snippet = `POST /api/v1/rag/ask\n{ "query": "…",\n  "filters": { "user_id": "${patientId}" },\n  "stream": false }`

  return (
    <div className="cols">
      <CardPad className="main stack">
        <div className="between">
          <h2 style={{ fontSize: '18px' }}>Ask about a patient</h2>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '10px',
          }}
        >
          <PatientPicker
            patients={patients}
            value={patientId}
            onChange={changePatient}
            disabled={patientsLoading}
          />
        </div>

        <div className="small muted">
          {[diagnosisLabel(patient), patient?.treating_doctor].filter(Boolean).join(' · ')}
          {patient ? '. ' : ''}Answers use only this patient’s documents and show where each fact
          came from.
        </div>

        {/* Remounts per patient, so changing the patient clears the answer and the input. */}
        <PatientQuestions key={patientId} patientId={patientId} questions={questions} />
      </CardPad>

      <aside className="rail">
        <ApiRail title="ask" apis={ASK_PATIENT_APIS} snippet={snippet} />
        <ActivityRail />
      </aside>
    </div>
  )
}
