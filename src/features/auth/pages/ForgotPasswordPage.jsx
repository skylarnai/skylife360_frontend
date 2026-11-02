import { useState } from 'react'
import { Link } from 'react-router-dom'
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
          <Note tone="live">
            If that email has an account, a reset link is on its way.
          </Note>
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

        <div>
          <Link to={ROUTES.LOGIN} className="link small">
            ← Back to sign in
          </Link>
        </div>
      </form>
    </AuthCard>
  )
}
