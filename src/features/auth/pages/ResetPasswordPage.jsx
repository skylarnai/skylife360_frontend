import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { ErrorBox } from '@/components/ui/ErrorBox'
import { Note } from '@/components/ui/Note'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { authApi } from '@/services/auth/authApi'
import { AuthCard } from '../components/AuthCard'
import { PasswordInput } from '../components/PasswordInput'
import { resetSchema } from '../schemas/resetSchema'

export function ResetPasswordPage() {
  useDocumentTitle('Choose a new password')
  const { token: pathToken } = useParams()
  const [searchParams] = useSearchParams()
  const queryToken = searchParams.get('token') || ''
  const urlToken = pathToken || queryToken

  const [token, setToken] = useState(urlToken)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const hasUrlToken = Boolean(urlToken)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const cleanToken = token.trim()
    const parsed = resetSchema.safeParse({
      token: cleanToken,
      newPassword,
      confirmPassword,
    })

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]?.message
      setError(firstIssue || 'Check your inputs and try again.')
      return
    }

    setLoading(true)
    try {
      await authApi.resetPassword({
        token: cleanToken,
        new_password: parsed.data.newPassword,
      })
      setDone(true)
    } catch (err) {
      if (err?.code === 'INVALID_RESET_TOKEN') {
        setError('Invalid or expired reset token. Please generate or request a new reset link.')
      } else {
        setError(err?.message || 'Could not reset password. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthCard>
      <form className="lform" noValidate onSubmit={handleSubmit}>
        <div className="lhead">
          <h2>Choose a new password</h2>
          <p>
            Enter your reset token and new password. Changing your password signs out all active sessions.
          </p>
        </div>

        {done ? (
          <div className="grid gap-4">
            <Note tone="live">
              Password changed successfully! You can now sign in with your new password.
            </Note>
            <Link to={ROUTES.LOGIN} className="btn pri w-full text-center">
              Sign in now →
            </Link>
          </div>
        ) : (
          <>
            <div className="lfields">
              {hasUrlToken ? (
                <div className="grid gap-1">
                  <div className="flex items-center justify-between">
                    <span className="lbl">Reset token</span>
                    <Chip tone="ok">From URL link</Chip>
                  </div>
                  <span className="inp">
                    <input
                      id="resetToken"
                      type="text"
                      className="font-mono text-xs"
                      value={token}
                      disabled={loading}
                      onChange={(e) => setToken(e.target.value)}
                    />
                  </span>
                </div>
              ) : (
                <label className="lfield" htmlFor="resetToken">
                  Reset token
                  <span className="inp">
                    <input
                      id="resetToken"
                      type="text"
                      autoComplete="off"
                      placeholder="Paste your reset token here (from link or CLI)"
                      className="font-mono text-xs"
                      value={token}
                      disabled={loading}
                      onChange={(e) => setToken(e.target.value)}
                    />
                  </span>
                </label>
              )}

              <PasswordInput
                id="newPw"
                label="New password"
                autoComplete="new-password"
                placeholder="At least 8 characters"
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

        <div className="flex justify-between items-center text-sm">
          <Link to={ROUTES.FORGOT_PASSWORD} className="link small">
            Need a token?
          </Link>
          <Link to={ROUTES.LOGIN} className="link small">
            ← Back to sign in
          </Link>
        </div>
      </form>
    </AuthCard>
  )
}
