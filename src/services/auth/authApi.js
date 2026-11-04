import { httpClient } from '@/services/api/httpClient'
import { env } from '@/config/env'

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
   * GET /api/v1/auth/oauth/google/login?tenant_id={tenant_id} (JSON Mode)
   * Fetches Google OAuth authorization consent URL
   */
  async getGoogleAuthUrl(tenantId) {
    const targetTenant = tenantId || env.defaultTenantId || 'HOSP-001'
    const { data } = await httpClient.get('/auth/oauth/google/login', {
      params: { tenant_id: targetTenant },
      headers: {
        Accept: 'application/json',
      },
    })
    return data?.auth_url
  },

  /**
   * Builds direct Google OAuth redirect URL
   */
  getGoogleLoginUrl(tenantId) {
    const targetTenant = encodeURIComponent(tenantId || env.defaultTenantId || 'HOSP-001')
    const base = env.apiBaseUrl || (typeof window !== 'undefined' ? '' : env.proxyTarget)
    return `${base}${env.apiPrefix}/auth/oauth/google/login?tenant_id=${targetTenant}`
  },

  /**
   * Triggers full-page browser redirection to Google OAuth consent screen
   */
  loginWithGoogle(tenantId) {
    window.location.href = this.getGoogleLoginUrl(tenantId)
  },

  /**
   * POST /api/v1/auth/oauth/google/verify
   * Verify Google ID token for SPA popup / one-tap flows
   */
  async verifyGoogleToken(payload) {
    const { data } = await httpClient.post('/auth/oauth/google/verify', {
      id_token: payload.id_token,
      tenant_id: payload.tenant_id || env.defaultTenantId || 'HOSP-001',
    })
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
   * GET /api/v1/auth/mfa/dev-code?mfa_token={mfa_token}
   * Autonomous retrieval API for live 6-digit TOTP code in development mode
   */
  async getMfaDevCode(mfaToken) {
    const { data } = await httpClient.get('/auth/mfa/dev-code', {
      params: { mfa_token: mfaToken },
    })
    return data
  },

  /**
   * Autonomous MFA resolution in development mode without human intervention
   */
  async completeMfaVerification(mfaToken, fallbackOtp) {
    let otpCode = fallbackOtp
    if (!otpCode) {
      const devRes = await this.getMfaDevCode(mfaToken)
      otpCode = devRes?.code
    }
    return this.verifyMfa({ mfa_token: mfaToken, code: otpCode })
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
