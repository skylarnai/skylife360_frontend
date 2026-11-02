import { env } from '@/config/env'
import { AuthSidePanel } from './AuthSidePanel'

export function AuthCard({ children }) {
  return (
    <div className="wrap login">
      <div className="lshell">
        <div className="card lbox">
          <AuthSidePanel />
          {children}
        </div>
        <div className="lfoot">
          <span>
            {env.showApiPanel ? (
              <>
                API · NEEDED: <code>POST /api/v1/auth/login</code> → session cookie + role. Backend
                calls today use an <code>X-API-Key</code>; keep it server-side, never in the
                browser.
              </>
            ) : null}
          </span>
          <span>© Sky Claims by Skylarn AI</span>
        </div>
      </div>
    </div>
  )
}
