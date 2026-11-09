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
          <span>Secure sign-in · Your hospital's data stays inside your hospital's workspace</span>
          <span>© Sky Claims by Skylarn AI</span>
        </div>
      </div>
    </div>
  )
}
