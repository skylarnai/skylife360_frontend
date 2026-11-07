import { httpClient } from '@/services/api/httpClient'

const enc = encodeURIComponent
const MAX_TEXT_PAGES = 20

function clean(params) {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, v]) => v !== undefined && v !== null && v !== '' && v !== 'all',
    ),
  )
}

export const filesApi = {
  /**
   * GET /api/v1/files?patient=&type=&status=&limit=&offset= (READY, backend 73c22bb)
   * Scoped to the caller (doctor: granted patients; staff and admins: whole hospital). Newest first.
   * `counts` covers the whole scope and ignores the filters (tiles); `total` counts the filtered rows.
   * 403 UNAUTHORIZED_USER when `patient` is outside a doctor's scope.
   * → { total, counts: { documents, ready, failed, patients }, items: FileListItem[] }
   */
  async listFiles(params = {}) {
    const { data } = await httpClient.get('/files', { params: clean({ limit: 200, ...params }) })
    return data
  },

  /**
   * GET /api/v1/files/{file_id}/text?page= (READY, one page per call)
   * → { file_id, page, total_pages, text, has_ocr }
   * Fetches every page (capped) and returns `{ pages: [{ page_number, heading, text }] }`.
   */
  async getFileText(fileId) {
    const first = (await httpClient.get(`/files/${enc(fileId)}/text`, { params: { page: 1 } })).data
    const total = Math.min(first?.total_pages || 1, MAX_TEXT_PAGES)
    const rest = await Promise.all(
      Array.from({ length: Math.max(total - 1, 0) }, (_, i) =>
        httpClient
          .get(`/files/${enc(fileId)}/text`, { params: { page: i + 2 } })
          .then((r) => r.data),
      ),
    )
    const pages = [first, ...rest]
      .filter((p) => p?.text)
      .map((p) => ({ page_number: p.page, heading: null, text: p.text }))
    return { pages, has_ocr: Boolean(first?.has_ocr) }
  },

  /**
   * GET /api/v1/ingestion/files/{file_id} (READY)
   * Status, size, timestamps, extraction summary.
   */
  async getFileStatus(fileId) {
    const { data } = await httpClient.get(`/ingestion/files/${enc(fileId)}`)
    return data
  },
}
