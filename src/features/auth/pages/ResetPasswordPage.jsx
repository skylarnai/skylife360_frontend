import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { Button } from '@/components/ui/Button'
import { ErrorBox } from '@/components/ui/ErrorBox'
import { Note } from '@/components/ui/Note'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { authApi } from '@/services/auth/authApi'
import { AuthCard } from '../components/AuthCard'
import { PasswordInput } from '../components/PasswordInput'
import { resetSchema } from '../schemas/resetSchema'

export function ResetPasswordPage() {
  useDocumentTitle('Choose a new password')
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || 'demo-reset-token'

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const parsed = resetSchema.safeParse({ newPassword, confirmPassword })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || 'Check your password and try again.')
      return
    }

    setLoading(true)
    try {
      await authApi.resetPassword({
        token,
        new_password: parsed.data.newPassword,
      })
      setDone(true)
    } catch (err) {
      setError(err?.message || 'Could not reset password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthCard>
      <form className="lform" noValidate onSubmit={handleSubmit}>
        <div className="lhead">
          <h2>Choose a new password</h2>
          <p>Use at least 12 characters. Changing your password signs out all active sessions.</p>
        </div>

        {done ? (
          <Note tone="live">
            Password changed. Sign in with your new password.
          </Note>
        ) : (
          <>
            <div className="lfields">
              <PasswordInput
                id="newPw"
                label="New password"
                autoComplete="new-password"
                placeholder="At least 12 characters"
                value={newPassword}
                disabled={loading}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <PasswordInput
                id="confirmPw"
                label="Confirm new password"
                autoComplete="new-password"
                placeholder="Re-enter your new password"
                value={confirmPassword}
                disabled={loading}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            {error ? <ErrorBox message={error} /> : null}

            <Button type="submit" variant="pri" className="lgo" loading={loading}>
              {loading ? 'Saving…' : 'Save new password'}
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
