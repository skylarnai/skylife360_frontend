import { env } from '@/config/env'
import { httpClient } from '@/services/api/httpClient'
import { useSessionStore } from '@/store/sessionStore'

export const ragApi = {
  /**
   * POST /api/v1/rag/ask (READY)
   * Answer with sources · stream=false returns JSON
   */
  async ask({ query, filters = {}, topK, stream = false }) {
    const { data } = await httpClient.post('/rag/ask', {
      query,
      filters,
      ...(topK ? { top_k: topK } : {}),
      stream,
    })
    return data
  },

  /**
   * POST /api/v1/rag/ask (stream=true via fetch + SSE) (READY)
   */
  async askStream({ query, filters = {}, topK, signal, onToken, onComplete }) {
    const csrfToken = useSessionStore.getState().csrfToken
    const response = await fetch(`${env.apiBaseUrl}${env.apiPrefix}/rag/ask`, {
      method: 'POST',
      credentials: 'include',
      signal,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      },
      body: JSON.stringify({
        query,
        filters,
        ...(topK ? { top_k: topK } : {}),
        stream: true,
      }),
    })

    if (!response.ok || !response.body) {
      throw new Error(`Streaming request failed (${response.status})`)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data:')) continue
        const payload = trimmed.slice(5).trim()
        if (payload === '[DONE]') {
          onComplete?.()
          return
        }
        try {
          const parsed = JSON.parse(payload)
          onToken?.(parsed)
        } catch {
          onToken?.({ token: payload })
        }
      }
    }
    onComplete?.()
  },

  /**
   * POST /api/v1/rag/search (READY)
   * Ranked passages only
   */
  async search({ query, filters = {}, topK, maxChunksPerFile }) {
    const { data } = await httpClient.post('/rag/search', {
      query,
      filters,
      ...(topK ? { top_k: topK } : {}),
      ...(maxChunksPerFile ? { max_chunks_per_file: maxChunksPerFile } : {}),
    })
    return data
  },
}
