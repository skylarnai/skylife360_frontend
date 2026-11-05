import { FILE_STATUS_MAP, INTEGRITY_FLAG_MAP } from '@/constants/statusMaps'
import { httpClient } from './httpClient'

export { ApiError, normalizeApiError } from './apiError'
export { httpClient } from './httpClient'

export async function fetchStatuses() {
  try {
    const { data } = await httpClient.get('/statuses')
    return data
  } catch {
    return {
      file: FILE_STATUS_MAP,
      integrity: INTEGRITY_FLAG_MAP,
    }
  }
}

/**
 * True when the backend route itself is missing (NEEDED endpoint not shipped yet):
 * FastAPI's plain `{"detail": "Not Found"}` 404, 405 or 501. Domain errors such as
 * 403 ACCESS_DENIED or a 404 with an error code are real answers and must surface.
 */
export function isEndpointMissing(error) {
  const status = error?.status ?? error?.response?.status
  if (status === 405 || status === 501) return true
  return status === 404 && (error?.code === 'HTTP_404' || error?.code === undefined)
}

/**
 * Call a NEEDED endpoint and fall back to mock data while it does not exist.
 * Returns `{ data, source: 'api' | 'mock' }` so screens can say they are showing demo data.
 */
export async function withMockFallback(request, mock) {
  try {
    return { data: await request(), source: 'api' }
  } catch (error) {
    if (!isEndpointMissing(error)) throw error
    return { data: await mock(), source: 'mock' }
  }
}
