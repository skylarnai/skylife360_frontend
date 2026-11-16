import { useSessionStore } from '@/store/sessionStore'

function userIdentity(user) {
  if (!user) return null
  return user.id ?? user.user_id ?? user.email ?? null
}

/**
 * Runs `reset` whenever a signed-in user leaves: logout, session expiry (401 -> clearSession),
 * or a different user replacing them. Per-user client state (query cache, activity log, claim
 * desk) registers here so the next person on the same browser never sees it.
 * The first sign-in (no user -> user) does not trigger a reset.
 */
export function onUserChange(reset) {
  return useSessionStore.subscribe((state, prev) => {
    const before = userIdentity(prev.user)
    if (before !== null && before !== userIdentity(state.user)) reset()
  })
}
