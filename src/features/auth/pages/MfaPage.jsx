import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { env } from '@/config/env'
import { ROUTES } from '@/constants/routes'
import { Button } from '@/components/ui/Button'
import { ErrorBox } from '@/components/ui/ErrorBox'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useSessionStore } from '@/store/sessionStore'
import { AuthCard } from '../components/AuthCard'
import { OtpInput } from '../components/OtpInput'
import { mapAuthErrorMessage } from '../hooks/useLogin'
import { useVerifyMfa } from '../hooks/useVerifyMfa'
import { mfaSchema } from '../schemas/mfaSchema'

export function MfaPage() {
  useDocumentTitle('Verify MFA')
  const mfaToken = useSessionStore((state) => state.mfaToken)
  const mfaEmail = useSessionStore((state) => state.mfaEmail)
  const clearMfaChallenge = useSessionStore((state) => state.clearMfaChallenge)
  const verifyMfaMutation = useVerifyMfa()

  const [code, setCode] = useState(env.showApiPanel ? '123456' : '')
  const [validationError, setValidationError] = useState('')

  if (!mfaToken && !env.showApiPanel) {
    return <Navigate to={ROUTES.LOGIN} replace />
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setValidationError('')

    const parsed = mfaSchema.safeParse({ code })
    if (!parsed.success) {
      setValidationError(
        parsed.error.issues[0]?.message || 'Enter the 6-digit code from your authenticator app.'
      )
      return
    }

    verifyMfaMutation.mutate({
      mfa_token: mfaToken || 'mfa-dev-token',
      code: parsed.data.code,
    })
  }

  const errorMessage =
    validationError ||
    (verifyMfaMutation.isError ? mapAuthErrorMessage(verifyMfaMutation.error) : '')

  return (
    <AuthCard>
      <form className="lform" noValidate onSubmit={handleSubmit}>
        <div className="lhead">
          <h2>Two-step verification</h2>
          <p>
            Enter the 6-digit code from your authenticator app
            {mfaEmail ? ` for ${mfaEmail}` : ''}.
          </p>
        </div>

        <div className="lfields">
          <OtpInput
            value={code}
            disabled={verifyMfaMutation.isPending}
            onChange={(nextVal) => setCode(nextVal)}
          />
          {env.showApiPanel && (
            <span className="small muted">
              Demo authenticator code: <code>123456</code>
            </span>
          )}
        </div>

        {errorMessage ? <ErrorBox message={errorMessage} /> : null}

        <Button
          type="submit"
          variant="pri"
          className="lgo"
          loading={verifyMfaMutation.isPending}
        >
          {verifyMfaMutation.isPending ? 'Verifying…' : 'Verify'}
        </Button>

        <div>
          <Link
            to={ROUTES.LOGIN}
            className="link small"
            onClick={() => clearMfaChallenge()}
          >
            ← Back to sign in
          </Link>
        </div>
      </form>
    </AuthCard>
  )
}
