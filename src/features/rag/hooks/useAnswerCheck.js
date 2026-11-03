import { useMutation } from '@tanstack/react-query'
import { evaluationApi } from '../api/evaluationApi'

/**
 * Hook to evaluate generated RAG answers against context chunks.
 * Backend: POST /api/v1/evaluation/evaluate
 */
export function useAnswerCheck() {
  return useMutation({
    mutationFn: ({ query, generatedResponse, contextChunks = [], generationId, userId }) =>
      evaluationApi.evaluate({
        query,
        generatedResponse,
        contextChunks,
        generationId,
        userId,
      }),
  })
}

