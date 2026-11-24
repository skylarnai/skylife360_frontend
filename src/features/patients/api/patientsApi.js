import { httpClient } from '@/services/api/httpClient'

const enc = encodeURIComponent

export const patientsApi = {
  /**
   * GET /api/v1/patients?q=&limit=&offset= (READY, backend 73c22bb)
   * Patients with a claim or uploaded documents. The backend scopes it: a doctor (VIEWER) gets only
   * the patients granted to them; records staff and admins get the whole hospital.
   * `mine=true` is NOT sent: it would narrow staff and admins to their own grants.
   * → { total, items: [{ user_id, name, sex, age, procedure_name, diagnosis: { code, name } | null,
   *      treating_doctor, claim_id, claim_stage, admission_date, discharge_date }] } (never amounts)
   */
  async listPatients({ q } = {}) {
    const params = { limit: 500, ...(q ? { q } : {}) }
    const { data } = await httpClient.get('/patients', { params })
    return data
  },

  /**
   * GET /api/v1/patients/{user_id} (READY)
   * One patient (same shape). 403 UNAUTHORIZED_USER outside the caller's scope, 404 NOT_FOUND if unknown.
   */
  async getPatient(userId) {
    const { data } = await httpClient.get(`/patients/${enc(userId)}`)
    return data
  },
}
