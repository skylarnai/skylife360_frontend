import { useState } from 'react'
import { Link } from 'react-router-dom'
import { env } from '@/config/env'
import { ROUTES } from '@/constants/routes'
import { Button } from '@/components/ui/Button'
import { ErrorBox } from '@/components/ui/ErrorBox'
import { Note } from '@/components/ui/Note'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { authApi } from '@/services/auth/authApi'
import { AuthCard } from '../components/AuthCard'
import { forgotPasswordSchema } from '../schemas/resetSchema'

export function ForgotPasswordPage() {
  useDocumentTitle('Forgot password')
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const parsed = forgotPasswordSchema.safeParse({ email })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || 'Enter your work email.')
      return
    }

    setLoading(true)
    try {
      await authApi.forgotPassword({ email: parsed.data.email })
      setSubmitted(true)
    } catch (err) {
      setError(err?.message || 'Could not send reset link. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthCard>
      <form className="lform" noValidate onSubmit={handleSubmit}>
        <div className="lhead">
          <h2>Reset your password</h2>
          <p>Enter your hospital work email and we will send a link to set a new password.</p>
        </div>

        {submitted ? (
          <div className="grid gap-3">
            <Note tone="live">
              If that email has an account, a reset link is on its way.
            </Note>

            <Link to={ROUTES.RESET_PASSWORD} className="btn pri w-full text-center">
              Continue to enter reset token →
            </Link>

            {env.showApiPanel && (
              <div className="rounded-lg border border-line bg-tint p-3 text-xs grid gap-1.5 mt-2">
                <span className="font-semibold text-fg">Development Testing Tip:</span>
                <span className="text-muted">
                  Pass the token directly in the URL:
                </span>
                <code className="p-1.5 rounded bg-surface text-fg font-mono block select-all overflow-x-auto text-[11px]">
                  http://localhost:5173/reset-password?token=&lt;TOKEN&gt;
                </code>
                <span className="text-muted text-[11px]">
                  Or path format: <code>/reset-password/&lt;TOKEN&gt;</code>
                </span>
                <span className="text-muted text-[11px] mt-1">
                  CLI command to generate a token:
                </span>
                <code className="p-1 rounded bg-surface font-mono block select-all text-[11px]">
                  python -m app.manage reset-token --tenant-id HOSP-001 --email {email || 'admin@hosp.org'}
                </code>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="lfields">
              <label className="lfield" htmlFor="forgotEmail">
                Work email
                <span className="inp">
                  <input
                    id="forgotEmail"
                    type="email"
                    autoComplete="username"
                    placeholder="name@hospital.org"
                    value={email}
                    disabled={loading}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </span>
              </label>
            </div>

            {error ? <ErrorBox message={error} /> : null}

            <Button type="submit" variant="pri" className="lgo" loading={loading}>
              {loading ? 'Sending…' : 'Send reset link'}
            </Button>
          </>
        )}

        <div className="flex justify-between items-center text-sm">
          <Link to={ROUTES.RESET_PASSWORD} className="link small">
            Already have a reset token?
          </Link>
          <Link to={ROUTES.LOGIN} className="link small">
            ← Back to sign in
          </Link>
        </div>
      </form>
    </AuthCard>
  )
}
