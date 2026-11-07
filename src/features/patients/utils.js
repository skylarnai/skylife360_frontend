// Generic questions for the Ask screen (S06, hidden while VITE_ENABLE_ASK=false).
const DEFAULT_SUGGESTED_QUESTIONS = [
  'What procedure was done, and when?',
  'What is the final diagnosis?',
  'What was advised on discharge?',
]

/** "SYN-P-1042 · Asha Rao · Laparoscopic cholecystectomy" */
export function patientLabel(patient) {
  if (!patient) return ''
  return [patient.user_id, patient.name, patient.procedure_name].filter(Boolean).join(' · ')
}

export function diagnosisLabel(patient) {
  const dx = patient?.diagnosis
  if (!dx) return ''
  return [dx.code, dx.name].filter(Boolean).join(' · ')
}

export function suggestedQuestionsFor() {
  return DEFAULT_SUGGESTED_QUESTIONS
}

/** Plain words for the doctor-scope errors from /patients and /files. */
export function patientErrorMessage(error) {
  if (!error) return ''
  if (error.status === 403 || error.code === 'UNAUTHORIZED_USER') {
    return 'This patient isn’t one of yours. Ask an admin to grant them to you if you treat them.'
  }
  if (error.status === 404) return 'No patient with this ID has a claim or documents yet.'
  return error.message || 'Could not load the patient.'
}
