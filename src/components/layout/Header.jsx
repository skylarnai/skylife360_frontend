import { useNavigate } from 'react-router-dom'
import { env } from '@/config/env'
import { getLandingRoute, ROUTES } from '@/constants/routes'
import { Logo } from '@/components/common/Logo'
import { useSession } from '@/hooks/useSession'
import { useUiStore } from '@/store/uiStore'

export function Header() {
  const navigate = useNavigate()
  const { user, role, hospital, isAdmin, logout } = useSession()
  const apiPanel = useUiStore((state) => state.apiPanel)
  const toggleApiPanel = useUiStore((state) => state.toggleApiPanel)

  // /auth/me does not return hospital details yet; fall back to the tenant id.
  const hospitalName = hospital?.name || user?.tenant_id || env.appName
  const hospitalCity = hospital?.city || null
  const deskLabel = isAdmin ? 'claims desk' : 'clinical records'

  const handleSignOut = async () => {
    await logout()
    navigate(ROUTES.LOGIN, { replace: true })
  }

  return (
    <header className="hdr">
      <div className="wrap">
        <Logo to={getLandingRoute(role)} />
        <div className="hosp">
          {hospitalName}
          <small>
            {hospitalCity ? `${hospitalCity} · ${deskLabel}` : deskLabel}
          </small>
        </div>
        {user && (
          <div className="who">
            <span className="pill">
              {user.name} · {user.title}
            </span>
            <span className="role-tag">{isAdmin ? 'ADMIN' : 'DOCTOR / STAFF'}</span>
            {env.showApiPanel && (
              <button
                type="button"
                className="hbtn"
                aria-pressed={apiPanel}
                onClick={toggleApiPanel}
                title="Show or hide the API panels used for development"
              >
                API panel
              </button>
            )}
            <button type="button" className="hbtn" onClick={handleSignOut}>
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
