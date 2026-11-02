import { httpClient } from '@/services/api/httpClient'

export const authApi = {
  /**
   * GET /api/v1/auth/me
   * App start: user, role, permissions, csrf_token
   */
  async me() {
    const { data } = await httpClient.get('/auth/me')
    return data
  },

  /**
   * POST /api/v1/auth/login
   * { email, password } -> session cookie + user/role, or { mfa_required, mfa_token, dev_otp }
   */
  async login(payload) {
    const { data } = await httpClient.post('/auth/login', {
      email: payload.email,
      password: payload.password,
    })
    return data
  },

  /**
   * POST /api/v1/auth/mfa/verify
   * { mfa_token, code } -> session cookie + user/role
   */
  async verifyMfa(payload) {
    const { data } = await httpClient.post('/auth/mfa/verify', {
      mfa_token: payload.mfa_token,
      code: payload.code,
    })
    return data
  },

  /**
   * POST /api/v1/auth/logout
   * Clears the session cookie
   */
  async logout() {
    await httpClient.post('/auth/logout')
  },

  /**
   * POST /api/v1/auth/password/forgot
   * { email } -> 202 { message, reset_token } (reset_token is only returned in development)
   */
  async forgotPassword(payload) {
    const { data } = await httpClient.post('/auth/password/forgot', {
      email: payload.email,
    })
    return data
  },

  /**
   * POST /api/v1/auth/password/reset
   * { token, new_password } -> 200 { status }
   */
  async resetPassword(payload) {
    const { data } = await httpClient.post('/auth/password/reset', {
      token: payload.token,
      new_password: payload.new_password,
    })
    return data
  },
}
