import { httpClient } from '@/services/api/httpClient'
import { MOCK_USERS } from './usersApi.mock'

export const usersApi = {
  /**
   * GET /api/v1/users?role=&q=&limit=&offset= (NEEDED)
   */
  async getUsers(params = {}) {
    try {
      const { data } = await httpClient.get('/users', { params })
      return data
    } catch {
      return {
        total: MOCK_USERS.length,
        items: MOCK_USERS,
      }
    }
  },

  /**
   * POST /api/v1/users (NEEDED)
   * { name, email, title, role }
   */
  async inviteUser(payload) {
    const { data } = await httpClient.post('/users', payload)
    return data
  },

  /**
   * PATCH /api/v1/users/{id} (NEEDED)
   * { role?, title?, is_active? }
   */
  async updateUser(userId, payload) {
    const { data } = await httpClient.patch(`/users/${userId}`, payload)
    return data
  },

  /**
   * GET /api/v1/users/{id}/patients (NEEDED)
   */
  async getUserPatients(userId) {
    const { data } = await httpClient.get(`/users/${userId}/patients`)
    return data
  },

  /**
   * POST /api/v1/users/{id}/patients (NEEDED)
   */
  async addUserPatient(userId, patientId) {
    const { data } = await httpClient.post(`/users/${userId}/patients`, {
      user_id: patientId,
    })
    return data
  },

  /**
   * DELETE /api/v1/users/{id}/patients/{user_id} (NEEDED)
   */
  async removeUserPatient(userId, patientId) {
    const { data } = await httpClient.delete(`/users/${userId}/patients/${patientId}`)
    return data
  },
}
