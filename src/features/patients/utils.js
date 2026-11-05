import { DEFAULT_SUGGESTED_QUESTIONS, SUGGESTED_QUESTIONS_BY_PATIENT } from './api/patientsApi.mock'

export function patientLabel(patient) {
  if (!patient) return ''
  return patient.procedure_name ? `${patient.user_id} · ${patient.procedure_name}` : patient.user_id
}

export function diagnosisLabel(patient) {
  const dx = patient?.diagnosis
  if (!dx) return ''
  return [dx.code, dx.name].filter(Boolean).join(' · ')
}

export function suggestedQuestionsFor(userId) {
  return SUGGESTED_QUESTIONS_BY_PATIENT[userId] || DEFAULT_SUGGESTED_QUESTIONS
}
