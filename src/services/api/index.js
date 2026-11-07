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
