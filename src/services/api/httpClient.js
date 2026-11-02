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

function generateUUID() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export const httpClient = axios.create({
  baseURL: `${env.apiBaseUrl}${env.apiPrefix}`,
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
    const isAuthLoginEndpoint = requestUrl.includes('/auth/login')

    if (apiError.status === 401 && !isAuthLoginEndpoint) {
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
