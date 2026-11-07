import { httpClient } from '@/services/api/httpClient'

const enc = encodeURIComponent

// /api/v1/users (READY) · every route needs users:manage (403 INSUFFICIENT_PERMISSIONS otherwise).
export const usersApi = {
  /**
   * GET /api/v1/users?role=&limit=&offset=
   * → { total, limit, offset, items: [{ id, email, name, role, permissions[], is_active, mfa_enabled, created_at }] }
   * `permissions` is the effective list: custom permissions if set, else the role defaults.
   */
  async getUsers({ role, limit = 200, offset = 0 } = {}) {
    const { data } = await httpClient.get('/users', {
      params: { limit, offset, ...(role ? { role } : {}) },
    })
    return data
  },

  /**
   * POST /api/v1/users { email, name, role, temporary_password, permissions? } → UserOut (201)
   * 409 USER_ALREADY_EXISTS. Admins get MFA automatically.
   */
  async createUser(payload) {
    const { data } = await httpClient.post('/users', payload)
    return data
  },

  /**
   * PATCH /api/v1/users/{id} { name?, role?, permissions?, is_active? } → UserOut
   * Changing role, permissions or is_active signs the user out everywhere.
   * Custom `permissions` REPLACE the role defaults.
   */
  async updateUser(userId, payload) {
    const { data } = await httpClient.patch(`/users/${enc(userId)}`, payload)
    return data
  },

  /** GET /api/v1/users/{id}/user-access → { auth_user_id, assigned_user_ids[] } (patients granted) */
  async getPatientGrants(userId) {
    const { data } = await httpClient.get(`/users/${enc(userId)}/user-access`)
    return data
  },

  /** POST /api/v1/users/{id}/user-access { user_ids: [patientId, …] } → { auth_user_id, assigned_user_ids[] } */
  async grantPatients(userId, patientIds) {
    const { data } = await httpClient.post(`/users/${enc(userId)}/user-access`, {
      user_ids: patientIds,
    })
    return data
  },

  /** DELETE /api/v1/users/{id}/user-access/{patient_id} → 204 */
  async revokePatient(userId, patientId) {
    await httpClient.delete(`/users/${enc(userId)}/user-access/${enc(patientId)}`)
  },
}
