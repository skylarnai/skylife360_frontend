import { MESSAGES } from '@/constants/messages'

export class ApiError extends Error {
  constructor({ status = 0, code = 'UNKNOWN_ERROR', message = MESSAGES.GENERIC_ERROR, details = null }) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.message = message
    this.details = details
  }
}

export function normalizeApiError(error) {
  if (error instanceof ApiError) {
    return error
  }

  if (!error?.response) {
    return new ApiError({
      status: 0,
      code: 'NETWORK_ERROR',
      message: error?.message && error.message !== 'Network Error' ? error.message : MESSAGES.NETWORK_ERROR,
      details: null,
    })
  }

  const { status, data } = error.response
  const detail = data?.detail

  if (status === 403) {
    return new ApiError({
      status: 403,
      code: detail?.code || 'FORBIDDEN',
      message: detail?.message || MESSAGES.ACCESS_DENIED,
      details: detail || data,
    })
  }

  if (status === 409) {
    return new ApiError({
      status: 409,
      code: detail?.code || 'STALE_VERSION',
      message: detail?.message || MESSAGES.STALE_VERSION,
      details: detail || data,
    })
  }

  if (detail && typeof detail === 'object' && !Array.isArray(detail)) {
    return new ApiError({
      status,
      code: detail.code || detail.error_code || `HTTP_${status}`,
      message: detail.message || data?.message || MESSAGES.GENERIC_ERROR,
      details: detail,
    })
  }

  if (Array.isArray(detail)) {
    const firstMsg = detail[0]?.msg ? `${detail[0].loc?.slice(1).join('.') || 'Field'}: ${detail[0].msg}` : MESSAGES.GENERIC_ERROR
    return new ApiError({
      status,
      code: 'VALIDATION_ERROR',
      message: firstMsg,
      details: detail,
    })
  }

  if (typeof detail === 'string') {
    return new ApiError({
      status,
      code: `HTTP_${status}`,
      message: detail,
      details: null,
    })
  }

  return new ApiError({
    status,
    code: data?.code || `HTTP_${status}`,
    message: data?.message || MESSAGES.GENERIC_ERROR,
    details: data || null,
  })
}
