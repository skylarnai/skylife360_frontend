import { useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import { intakeApi } from '../api/intakeApi'

/**
 * Executes Claim Intake (GAP-04) with an Idempotency-Key.
 * Reuses the same key on error retry; generates a new key on new inputs.
 */
export function useRunIntake() {
  const idempotencyKeyRef = useRef(crypto.randomUUID())

  const startNewRun = () => {
    idempotencyKeyRef.current = crypto.randomUUID()
  }

  const mutation = useMutation({
    mutationFn: (payload) => intakeApi.createIntake(payload, idempotencyKeyRef.current),
    onSuccess: () => {
      // Rotate key after a successful execution
      idempotencyKeyRef.current = crypto.randomUUID()
    },
  })

  return {
    ...mutation,
    runIntake: mutation.mutate,
    runIntakeAsync: mutation.mutateAsync,
    startNewRun,
  }
}

