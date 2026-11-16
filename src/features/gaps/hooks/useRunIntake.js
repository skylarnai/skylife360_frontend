import { useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import { generateUUID } from '@/services/api/httpClient'
import { intakeApi } from '../api/intakeApi'

/**
 * Executes Claim Intake (GAP-04) with an Idempotency-Key.
 * The key is reused only when the exact same payload is retried after an error; a changed
 * payload (the user fixed a field) or a successful run gets a new key.
 */
export function useRunIntake() {
  const idempotencyRef = useRef(null) // { key, body }

  const startNewRun = () => {
    idempotencyRef.current = null
  }

  const keyFor = (payload) => {
    let body
    try {
      body = JSON.stringify(payload ?? null)
    } catch {
      body = null
    }
    const current = idempotencyRef.current
    if (current && body !== null && current.body === body) return current.key
    const key = generateUUID()
    idempotencyRef.current = { key, body }
    return key
  }

  const mutation = useMutation({
    mutationFn: (payload) => intakeApi.createIntake(payload, keyFor(payload)),
    onSuccess: () => {
      // The next run is new work
      idempotencyRef.current = null
    },
  })

  return {
    ...mutation,
    runIntake: mutation.mutate,
    runIntakeAsync: mutation.mutateAsync,
    startNewRun,
  }
}
