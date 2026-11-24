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
  // Only returned by the backend in development mode (production emails the link instead).
  const [devResetToken, setDevResetToken] = useState(null)
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
      const result = await authApi.forgotPassword({ email: parsed.data.email })
      setDevResetToken(result?.reset_token || null)
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

            {devResetToken ? (
              <>
                <Link
                  to={`${ROUTES.RESET_PASSWORD}?token=${encodeURIComponent(devResetToken)}`}
                  className="btn pri w-full text-center"
                >
                  Set a new password →
                </Link>
                {env.showApiPanel && (
                  <span className="small muted">
                    Dev mode: the backend returned the reset token directly, so no email is needed.
                  </span>
                )}
              </>
            ) : (
              <Link to={ROUTES.RESET_PASSWORD} className="btn pri w-full text-center">
                Continue to enter reset token →
              </Link>
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
