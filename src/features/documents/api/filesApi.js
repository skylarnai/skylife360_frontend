import { httpClient, withMockFallback } from '@/services/api'
import { MOCK_FILES } from './filesApi.mock'

const enc = encodeURIComponent
const MAX_TEXT_PAGES = 20

const isMockFile = (fileId) => MOCK_FILES.some((f) => f.file_id === fileId)

function filterMock({ patient, type, status } = {}) {
  return MOCK_FILES.filter(
    (f) =>
      (!patient || patient === 'all' || f.user_id === patient) &&
      (!type || type === 'all' || f.classification_type === type) &&
      (!status || status === 'all' || f.status === status),
  )
}

function clean(params) {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, v]) => v !== undefined && v !== null && v !== '' && v !== 'all',
    ),
  )
}

export const filesApi = {
  /**
   * GET /api/v1/files?patient=&type=&status=&limit=&offset= (NEEDED)
   * Scoped to the caller (doctor: care-team patients). Newest first.
   * → { total, counts: { documents, ready, failed, patients }, items: FileListItem[] }
   */
  async listFiles(params = {}) {
    return withMockFallback(
      async () =>
        (await httpClient.get('/files', { params: clean({ limit: 200, ...params }) })).data,
      () => {
        const items = filterMock(params)
        return {
          total: items.length,
          counts: {
            documents: MOCK_FILES.length,
            ready: MOCK_FILES.filter((f) => f.status === 'INDEXED').length,
            failed: MOCK_FILES.filter((f) => f.status === 'EXTRACTION_FAILED').length,
            patients: new Set(MOCK_FILES.map((f) => f.user_id)).size,
          },
          items,
        }
      },
    )
  },

  /**
   * GET /api/v1/files/{file_id}/text?page= (READY, one page per call)
   * → { file_id, page, total_pages, text, has_ocr }
   * Fetches every page (capped) and returns `{ pages: [{ page_number, heading, text }] }`.
   */
  async getFileText(fileId) {
    const mock = MOCK_FILES.find((f) => f.file_id === fileId)
    if (mock) {
      return {
        source: 'mock',
        pages: mock.passages.map((p) => ({
          page_number: p.page_number,
          heading: p.heading,
          text: p.content,
        })),
      }
    }

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
    return { source: 'api', pages, has_ocr: Boolean(first?.has_ocr) }
  },

  /**
   * GET /api/v1/ingestion/files/{file_id} (READY)
   * Status, size, timestamps, extraction summary. Not called for mock files.
   */
  async getFileStatus(fileId) {
    if (isMockFile(fileId)) return null
    const { data } = await httpClient.get(`/ingestion/files/${enc(fileId)}`)
    return data
  },
}
