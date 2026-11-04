import { useState, useEffect } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { env } from '@/config/env'
import { ROUTES } from '@/constants/routes'
import { Button } from '@/components/ui/Button'
import { ErrorBox } from '@/components/ui/ErrorBox'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { authApi } from '@/services/auth/authApi'
import { useSessionStore } from '@/store/sessionStore'
import { AuthCard } from '../components/AuthCard'
import { OtpInput } from '../components/OtpInput'
import { mapAuthErrorMessage } from '../hooks/useLogin'
import { useVerifyMfa } from '../hooks/useVerifyMfa'
import { mfaSchema } from '../schemas/mfaSchema'

function parseMfaParamsFromUrl() {
  if (typeof window === 'undefined') return { mfaToken: null, devOtp: null }

  let mfaToken = null
  let devOtp = null

  // 1. Check URL hash (e.g. /login/mfa#mfa_token=...&dev_otp=849201)
  const hash = window.location.hash.replace(/^#/, '')
  if (hash) {
    const hashParams = new URLSearchParams(hash)
    mfaToken = hashParams.get('mfa_token')
    devOtp = hashParams.get('dev_otp')
  }

  // 2. Check query string (e.g. /login/mfa?mfa_token=...&dev_otp=849201)
  if (!mfaToken) {
    const searchParams = new URLSearchParams(window.location.search)
    mfaToken = searchParams.get('mfa_token')
    if (!devOtp) {
      devOtp = searchParams.get('dev_otp')
    }
  }

  return { mfaToken, devOtp }
}

export function MfaPage() {
  useDocumentTitle('Verify MFA')
  const storeMfaToken = useSessionStore((state) => state.mfaToken)
  const storeEmail = useSessionStore((state) => state.mfaEmail)
  const storeDevOtp = useSessionStore((state) => state.mfaDevOtp)
  const setMfaChallenge = useSessionStore((state) => state.setMfaChallenge)
  const clearMfaChallenge = useSessionStore((state) => state.clearMfaChallenge)
  const verifyMfaMutation = useVerifyMfa()

  // Support reading MFA challenge token & inline dev_otp directly from URL
  const [{ mfaToken: urlToken, devOtp: urlDevOtp }] = useState(() => parseMfaParamsFromUrl())
  const activeMfaToken = storeMfaToken || urlToken
  const availableOtp = urlDevOtp || storeDevOtp

  const [devEmail, setDevEmail] = useState(storeEmail)
  const [devCodeInfo, setDevCodeInfo] = useState(null)
  const [code, setCode] = useState(availableOtp || '')
  const [validationError, setValidationError] = useState('')

  useEffect(() => {
    if (urlToken && !storeMfaToken) {
      setMfaChallenge({ mfaToken: urlToken, email: devEmail, devOtp: urlDevOtp })
    }
  }, [urlToken, storeMfaToken, devEmail, urlDevOtp, setMfaChallenge])

  // Autonomous OTP retrieval via GET /api/v1/auth/mfa/dev-code if not already present
  useEffect(() => {
    if (!activeMfaToken || availableOtp || !env.showApiPanel) return

    let active = true
    authApi
      .getMfaDevCode(activeMfaToken)
      .then((res) => {
        if (!active) return
        if (res?.code) {
          setCode(res.code)
          setDevCodeInfo(res)
          if (res.email) {
            setDevEmail(res.email)
          }
        }
      })
      .catch((err) => {
        console.debug('Autonomous dev-code retrieval unavailable:', err)
      })

    return () => {
      active = false
    }
  }, [activeMfaToken, availableOtp])

  if (!activeMfaToken) {
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
      mfa_token: activeMfaToken,
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
            {(devEmail || storeEmail) ? ` for ${devEmail || storeEmail}` : ''}.
          </p>
        </div>

        <div className="lfields">
          <OtpInput
            value={code}
            disabled={verifyMfaMutation.isPending}
            onChange={(nextVal) => setCode(nextVal)}
          />
          {env.showApiPanel && (
            <div className="ldemo">
              <div className="top">
                <span className="lbl">Dev mode · Automated MFA</span>
                {devCodeInfo?.expires_in_seconds ? (
                  <span>Expires in {devCodeInfo.expires_in_seconds}s</span>
                ) : null}
              </div>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="small muted">
                  {availableOtp
                    ? 'Code auto-filled from backend dev_otp'
                    : devCodeInfo
                    ? 'Code retrieved from GET /api/v1/auth/mfa/dev-code'
                    : 'Dev mode: live code will auto-fill'}
                </span>
                {code && code.length === 6 && (
                  <Button
                    type="button"
                    variant="acc"
                    size="sm"
                    loading={verifyMfaMutation.isPending}
                    onClick={() => verifyMfaMutation.mutate({ mfa_token: activeMfaToken, code })}
                  >
                    Auto-Verify
                  </Button>
                )}
              </div>
            </div>
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
