import { useCallback, useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useRefreshClaim } from '@/features/claims/hooks/useClaimDocuments'
import { generateUUID } from '@/services/api/httpClient'
import { ingestionApi } from '../api/ingestionApi'

/**
 * Upload a batch of files for one patient, linked to a claim.
 *
 * The Idempotency-Key is kept until the upload succeeds, so retrying a failed
 * request resends the same key and the backend never creates a second batch.
 * Call `startNewUpload()` whenever the picked files change.
 */
export function useUploadBatch() {
  const refreshClaim = useRefreshClaim()
  const idempotencyKeyRef = useRef(null)
  const [progress, setProgress] = useState(0)

  const mutation = useMutation({
    mutationFn: ({ files, userId, claimId }) => {
      if (!idempotencyKeyRef.current) {
        idempotencyKeyRef.current = generateUUID()
      }
      setProgress(0)
      return ingestionApi.upload({
        files,
        userId,
        claimId,
        idempotencyKey: idempotencyKeyRef.current,
        onUploadProgress: (event) => {
          if (event.total) {
            setProgress(Math.min(100, Math.round((event.loaded * 100) / event.total)))
          }
        },
      })
    },
    onSuccess: (_data, { claimId }) => {
      idempotencyKeyRef.current = null
      if (claimId) refreshClaim(claimId)
    },
    onError: (error) => {
      // The key was used for a different set of files: the next try needs a fresh one.
      if (error?.code === 'IDEMPOTENCY_KEY_REUSED') {
        idempotencyKeyRef.current = null
      }
    },
  })

  const { reset } = mutation
  const startNewUpload = useCallback(() => {
    idempotencyKeyRef.current = null
    setProgress(0)
    reset()
  }, [reset])

  return { ...mutation, progress, startNewUpload }
}
