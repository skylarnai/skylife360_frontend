import { useQuery } from '@tanstack/react-query'
import { ragApi } from '@/features/rag/api/ragApi'
import { filesApi } from '../api/filesApi'

export function useDocuments(filters = {}, { enabled = true } = {}) {
  return useQuery({
    queryKey: ['files', filters],
    enabled,
    queryFn: () => filesApi.listFiles(filters),
    placeholderData: (previous) => previous,
    select: (data) => ({ ...data, items: data?.items || [] }),
  })
}

export function useDocumentText(fileId) {
  return useQuery({
    queryKey: ['files', fileId, 'text'],
    queryFn: () => filesApi.getFileText(fileId),
    enabled: Boolean(fileId),
    staleTime: 5 * 60_000,
  })
}

/**
 * POST /api/v1/rag/search (READY) — passages that match the search text, best per file.
 * Only runs for 3+ characters; returns a Map file_id → best passage.
 */
export function useDocumentSearch(query, patient) {
  const q = (query || '').trim()
  return useQuery({
    queryKey: ['files', 'search', q, patient || 'all'],
    enabled: q.length >= 3,
    staleTime: 60_000,
    retry: false,
    queryFn: async () => {
      const filters = patient && patient !== 'all' ? { user_id: patient } : {}
      const data = await ragApi.search({ query: q, filters, topK: 20, maxChunksPerFile: 1 })
      const byFile = new Map()
      ;(data?.results || []).forEach((hit) => {
        if (!byFile.has(hit.file_id)) byFile.set(hit.file_id, hit)
      })
      return byFile
    },
  })
}
