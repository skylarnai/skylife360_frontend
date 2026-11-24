import { useEffect } from 'react'
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { MESSAGES } from '@/constants/messages'
import { hasAnyPermission, isAdminRole, normalizeRole } from '@/constants/permissions'
import { getLandingRoute, ROUTES } from '@/constants/routes'
import { ErrorBox } from '@/components/ui/ErrorBox'
import { CardPad } from '@/components/ui/Card'
import { fetchStatuses } from '@/services/api'
import { authApi } from '@/services/auth/authApi'
import { useSessionStore } from '@/store/sessionStore'

function FullPageLoader() {
  return (
    <div className="wrap flex min-h-[60vh] items-center justify-center">
      <div className="row muted">
        <span
          aria-hidden="true"
          className="border-accent inline-block h-5 w-5 animate-spin rounded-full border-2 border-r-transparent"
        />
        <span className="mono small">Loading workspace…</span>
      </div>
    </div>
  )
}

export function RequireAuth({ children }) {
  const location = useLocation()
  const navigate = useNavigate()
  const user = useSessionStore((state) => state.user)
  const isHydrated = useSessionStore((state) => state.isHydrated)
  const setSession = useSessionStore((state) => state.setSession)
  const clearSession = useSessionStore((state) => state.clearSession)

  useQuery({
    queryKey: ['statuses'],
    queryFn: fetchStatuses,
    staleTime: Infinity,
    enabled: Boolean(user),
  })

  useEffect(() => {
    if (isHydrated) return undefined

    let active = true
    authApi
      .me()
      .then((sessionData) => {
        if (!active) return
        setSession(sessionData)
      })
      .catch(() => {
        if (!active) return
        const fullPath = `${location.pathname}${location.search}${location.hash}`
        clearSession(fullPath !== ROUTES.LOGIN ? fullPath : null)
      })

    return () => {
      active = false
    }
  }, [isHydrated, setSession, clearSession, location.pathname, location.search, location.hash])

  useEffect(() => {
    const handleUnauthorized = (event) => {
      const from = event?.detail?.from || `${location.pathname}${location.search}${location.hash}`
      navigate(ROUTES.LOGIN, {
        replace: true,
        state: { from },
      })
    }

    window.addEventListener('skyclaims:unauthorized', handleUnauthorized)
    return () => {
      window.removeEventListener('skyclaims:unauthorized', handleUnauthorized)
    }
  }, [navigate, location.pathname, location.search, location.hash])

  if (!isHydrated) {
    return <FullPageLoader />
  }

  if (!user) {
    const from = `${location.pathname}${location.search}${location.hash}`
    return <Navigate to={ROUTES.LOGIN} replace state={{ from }} />
  }

  return children || <Outlet />
}

export function RequireRole({ roles = [], children }) {
  const role = useSessionStore((state) => state.role)
  const normalizedUserRole = normalizeRole(role)
  const normalizedAllowed = roles.map((r) => normalizeRole(r))

  if (normalizedAllowed.length > 0 && !normalizedAllowed.includes(normalizedUserRole)) {
    return (
      <CardPad className="stack">
        <ErrorBox message={MESSAGES.ACCESS_DENIED} />
      </CardPad>
    )
  }

  return children || <Outlet />
}

function AccessDenied() {
  return (
    <CardPad className="stack">
      <ErrorBox message={MESSAGES.ACCESS_DENIED} />
    </CardPad>
  )
}

/**
 * Opens the route when the user has ANY of `anyOf` permissions (from /auth/me), or is an admin
 * when `allowAdmin` is set. Prefer this over RequireRole: the backend checks permissions, not roles.
 */
export function RequirePermission({ anyOf = [], allowAdmin = false, children }) {
  const role = useSessionStore((state) => state.role)
  const permissions = useSessionStore((state) => state.permissions)

  if ((allowAdmin && isAdminRole(role)) || hasAnyPermission(permissions, anyOf)) {
    return children || <Outlet />
  }
  return <AccessDenied />
}

export function PublicOnly({ children }) {
  const location = useLocation()
  const user = useSessionStore((state) => state.user)
  const role = useSessionStore((state) => state.role)
  const isHydrated = useSessionStore((state) => state.isHydrated)
  const returnToPath = useSessionStore((state) => state.returnToPath)
  const setSession = useSessionStore((state) => state.setSession)
  const clearSession = useSessionStore((state) => state.clearSession)

  useEffect(() => {
    if (isHydrated) return undefined

    let active = true
    authApi
      .me()
      .then((sessionData) => {
        if (!active) return
        setSession(sessionData)
      })
      .catch(() => {
        if (!active) return
        clearSession()
      })

    return () => {
      active = false
    }
  }, [isHydrated, setSession, clearSession])

  if (!isHydrated) {
    return <FullPageLoader />
  }

  if (user) {
    const destination = location.state?.from || returnToPath || getLandingRoute(role)
    return <Navigate to={destination} replace />
  }

  return children || <Outlet />
}
