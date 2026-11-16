import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { ragApi } from '../api/ragApi'
import { evaluationApi } from '../api/evaluationApi'

/**
 * Hook to submit a RAG question, receive response with citations and sources,
 * and automatically run response evaluation guardrail.
 */
export function useAsk() {
  const [evaluation, setEvaluation] = useState(null)
  const [evaluating, setEvaluating] = useState(false)

  const askMutation = useMutation({
    mutationFn: async ({ query, userId, fileIds, classificationTypes, topK }) => {
      setEvaluation(null)
      const filters = {}
      if (userId) filters.user_id = userId
      if (Array.isArray(fileIds) && fileIds.length > 0) filters.file_ids = fileIds
      if (Array.isArray(classificationTypes) && classificationTypes.length > 0) {
        filters.classification_types = classificationTypes
      }

      const response = await ragApi.ask({
        query,
        filters,
        topK,
        stream: false,
      })

      // Run answer check evaluation if an answer was provided
      if (response && response.answered && response.answer) {
        try {
          setEvaluating(true)
          const contextChunks = (response.sources || []).map((s) => s.content).filter(Boolean)
          const evalResult = await evaluationApi.evaluate({
            query: response.query || query,
            generatedResponse: response.answer,
            contextChunks,
            generationId: response.generation_id,
            userId,
          })
          setEvaluation(evalResult)
        } catch {
          // Evaluator may be skipped or in placeholder mode on backend
          setEvaluation(null)
        } finally {
          setEvaluating(false)
        }
      }

      return response
    },
  })

  return {
    ask: askMutation.mutate,
    askAsync: askMutation.mutateAsync,
    data: askMutation.data,
    isLoading: askMutation.isPending,
    isError: askMutation.isError,
    error: askMutation.error,
    reset: askMutation.reset,
    evaluation,
    isEvaluating: evaluating,
  }
}

