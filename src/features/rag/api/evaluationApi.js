import { httpClient } from '@/services/api/httpClient'

export const evaluationApi = {
  /**
   * POST /api/v1/evaluation/evaluate (READY)
   * Answer check: grounded, relevance, safety
   * Body: { query, generated_response, context_chunks?, generation_id?, user_id? }
   */
  async evaluate({ query, generatedResponse, contextChunks = [], generationId, userId }) {
    const { data } = await httpClient.post('/evaluation/evaluate', {
      query,
      generated_response: generatedResponse,
      context_chunks: contextChunks,
      ...(generationId ? { generation_id: generationId } : {}),
      ...(userId ? { user_id: userId } : {}),
    })
    return data
  },
}
