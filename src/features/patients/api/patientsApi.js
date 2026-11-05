import { httpClient, withMockFallback } from '@/services/api'
import { MOCK_PATIENTS, MOCK_TIMELINES } from './patientsApi.mock'

const enc = encodeURIComponent

export const patientsApi = {
  /**
   * GET /api/v1/patients?mine=true (NEEDED)
   * Patients the caller may see (doctor: care team via user_access; staff/admin: whole hospital).
   * → { total, items: Patient[] }
   */
  async listPatients() {
    return withMockFallback(
      async () => (await httpClient.get('/patients', { params: { mine: true } })).data,
      () => ({ total: MOCK_PATIENTS.length, items: MOCK_PATIENTS }),
    )
  },

  /**
   * GET /api/v1/patients/{user_id} (NEEDED)
   * → Patient: sex, age, diagnosis, procedure, treating doctor, dates, claim stage (never amounts)
   */
  async getPatient(userId) {
    return withMockFallback(
      async () => (await httpClient.get(`/patients/${enc(userId)}`)).data,
      () => MOCK_PATIENTS.find((p) => p.user_id === userId) || null,
    )
  },

  /**
   * GET /api/v1/patients/{user_id}/timeline (NEEDED)
   * → { user_id, events: [{ date, title, text, codes?, source: { file_id, original_filename, page_number } }] }
   */
  async getTimeline(userId) {
    return withMockFallback(
      async () => (await httpClient.get(`/patients/${enc(userId)}/timeline`)).data,
      () => ({ user_id: userId, events: MOCK_TIMELINES[userId] || [] }),
    )
  },
}
