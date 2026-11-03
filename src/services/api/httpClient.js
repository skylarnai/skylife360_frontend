import axios from 'axios'
import { env } from '@/config/env'
import { ROUTES } from '@/constants/routes'
import { useSessionStore } from '@/store/sessionStore'
import { normalizeApiError } from './apiError'

const WRITE_METHODS = new Set(['post', 'patch', 'put', 'delete'])

const IDEMPOTENT_PATHS = [
  '/ingestion/upload',
  '/claims/gaps/evaluate',
  '/claims/packets/assemble',
  '/claims/submissions',
]

function requiresIdempotencyKey(method, url = '', config = {}) {
  if (config.idempotent === true) return true
  if (String(method || '').toLowerCase() !== 'post') return false
  return IDEMPOTENT_PATHS.some((segment) => url.includes(segment))
}

export function generateUUID() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// In development, use relative prefix to route through Vite proxy and avoid browser CORS restrictions
const resolvedBaseUrl =
  import.meta.env.DEV &&
  (!env.apiBaseUrl ||
    env.apiBaseUrl.includes('localhost') ||
    env.apiBaseUrl.includes('127.0.0.1'))
    ? env.apiPrefix
    : `${env.apiBaseUrl}${env.apiPrefix}`

export const httpClient = axios.create({
  baseURL: resolvedBaseUrl,
  withCredentials: true,
  timeout: 30_000,
  headers: {
    Accept: 'application/json',
  },
})

httpClient.interceptors.request.use((config) => {
  const method = String(config.method || 'get').toLowerCase()
  const headers = config.headers || {}

  if (WRITE_METHODS.has(method)) {
    const csrfToken = useSessionStore.getState().csrfToken
    if (csrfToken && !headers['X-CSRF-Token']) {
      headers['X-CSRF-Token'] = csrfToken
    }
  }

  if (requiresIdempotencyKey(method, config.url, config) && !headers['Idempotency-Key']) {
    headers['Idempotency-Key'] = generateUUID()
  }

  config.headers = headers
  return config
})

httpClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const apiError = normalizeApiError(error)
    const requestUrl = error?.config?.url || ''
    // A 401 from login / MFA / password endpoints means bad credentials or code, not an
    // expired session. Only /auth/me (and every non-auth call) should end the session.
    const isAuthFlowEndpoint = requestUrl.includes('/auth/') && !requestUrl.includes('/auth/me')

    if (apiError.status === 401 && !isAuthFlowEndpoint) {
      const currentPath =
        typeof window !== 'undefined'
          ? `${window.location.pathname}${window.location.search}${window.location.hash}`
          : ROUTES.ROOT
      const returnPath = currentPath && !currentPath.startsWith(ROUTES.LOGIN) ? currentPath : null
      useSessionStore.getState().clearSession(returnPath)

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('skyclaims:unauthorized', {
            detail: { from: returnPath },
          })
        )
      }
    }

    return Promise.reject(apiError)
  }
)
