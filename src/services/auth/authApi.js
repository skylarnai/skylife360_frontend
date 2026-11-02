import { env } from '@/config/env'
import { httpClient } from '@/services/api/httpClient'
import {
  authApiMock,
  DEMO_USERS,
  getActiveMockRoleKey,
  setActiveMockRoleKey,
} from './authApi.mock'

export { DEMO_USERS, getActiveMockRoleKey, setActiveMockRoleKey }

export const authApi = {
  /**
   * GET /api/v1/auth/me
   * App start: user, role, permissions, hospital, csrf_token
   */
  async me() {
    if (env.authMock) {
      return authApiMock.me()
    }
    const { data } = await httpClient.get('/auth/me')
    return data
  },

  /**
   * POST /api/v1/auth/login
   * { email, password } -> session cookie + user/role or { mfa_required: true, mfa_token }
   */
  async login(payload) {
    if (env.authMock) {
      return authApiMock.login(payload)
    }
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
    if (env.authMock) {
      return authApiMock.verifyMfa(payload)
    }
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
    try {
      if (!env.authMock) {
        await httpClient.post('/auth/logout')
      }
    } finally {
      await authApiMock.logout()
    }
  },

  /**
   * POST /api/v1/auth/password/forgot
   * { email } -> always 202
   */
  async forgotPassword(payload) {
    if (env.authMock) {
      return authApiMock.forgotPassword(payload)
    }
    const { data } = await httpClient.post('/auth/password/forgot', {
      email: payload.email,
    })
    return data
  },

  /**
   * POST /api/v1/auth/password/reset
   * { token, new_password } -> 204
   */
  async resetPassword(payload) {
    if (env.authMock) {
      return authApiMock.resetPassword(payload)
    }
    const { data } = await httpClient.post('/auth/password/reset', {
      token: payload.token,
      new_password: payload.new_password,
    })
    return data
  },
}
