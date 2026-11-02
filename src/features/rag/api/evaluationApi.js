import { httpClient } from '@/services/api/httpClient'

export const evaluationApi = {
  /**
   * POST /api/v1/evaluation/evaluate (READY)
   * Answer check: grounded, relevance, safety
   */
  async evaluate({ generationId }) {
    const { data } = await httpClient.post('/evaluation/evaluate', {
      generation_id: generationId,
    })
    return data
  },
}
