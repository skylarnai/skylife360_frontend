import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { env } from '@/config/env'
import { DOCTOR_PANEL_ENABLED } from '@/constants/navigation'
import { ROUTES } from '@/constants/routes'
import { Button } from '@/components/ui/Button'
import { ErrorBox } from '@/components/ui/ErrorBox'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { AuthCard } from '../components/AuthCard'
import { GoogleSignInButton } from '../components/GoogleSignInButton'
import { PasswordInput } from '../components/PasswordInput'
import { TenantSelector } from '../components/TenantSelector'
import { useGoogleAuth } from '../hooks/useGoogleAuth'
import { mapAuthErrorMessage, useLogin } from '../hooks/useLogin'
import { loginSchema } from '../schemas/loginSchema'

function mapOAuthErrorMessage(code) {
  if (!code) return ''
  switch (code) {
    case 'ACCESS_DENIED':
      return 'Access denied: Your Google account is not provisioned or authorized for this hospital tenant. Contact your hospital administrator.'
    case 'invalid_or_expired_state':
      return 'The sign-in request expired or had an invalid state token. Please try signing in again.'
    case 'missing_oauth_parameters':
      return 'Google sign-in returned incomplete parameters. Please try again.'
    default:
      return `Google sign-in error: ${code}`
  }
}

export function LoginPage() {
  useDocumentTitle('Sign in')
  const [searchParams] = useSearchParams()
  const oauthErrorCode = searchParams.get('error')

  const loginMutation = useLogin()
  const googleAuth = useGoogleAuth()

  // Multi-tenancy: default hospital tenant with interactive switcher
  const [tenantId, setTenantId] = useState(env.defaultTenantId || 'HOSP-001')

  // "I'm signing in as": the server role must match, or sign-in stops (see useLogin)
  const [loginRole, setLoginRole] = useState('admin')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [validationError, setValidationError] = useState('')

  const selectRole = (role) => {
    setLoginRole(role)
    setValidationError('')
    loginMutation.reset()
  }

  const handleGoogleSignIn = () => {
    setValidationError('')
    googleAuth.clearError()
    googleAuth.loginWithGoogle(tenantId)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setValidationError('')
    googleAuth.clearError()

    const parsed = loginSchema.safeParse({ email, password })
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]?.message
      setValidationError(firstIssue || 'Enter your work email and password to continue.')
      return
    }

    loginMutation.mutate({
      email: parsed.data.email.toLowerCase(),
      password: parsed.data.password,
      expectedRole: loginRole,
    })
  }

  const isAnyLoading = loginMutation.isPending || googleAuth.isPending

  const errorMessage =
    validationError ||
    googleAuth.error ||
    mapOAuthErrorMessage(oauthErrorCode) ||
    (loginMutation.isError ? mapAuthErrorMessage(loginMutation.error) : '')

  return (
    <AuthCard>
      <form className="lform" id="loginForm" noValidate onSubmit={handleSubmit}>
        <div className="lhead">
          <h2>Welcome back</h2>
          <p>
            Sign in to continue. Your role decides which screens you see, so pick how you’ll be
            working today.
          </p>
        </div>

        <TenantSelector tenantId={tenantId} onTenantChange={setTenantId} disabled={isAnyLoading} />

        <div className="lgroup">
          <span className="lbl">I’m signing in as</span>
          <div className="seg" role="group" aria-label="Role">
            <button
              type="button"
              aria-pressed={loginRole === 'admin'}
              disabled={isAnyLoading}
              onClick={() => selectRole('admin')}
            >
              <b>Admin</b>
              <small>Run the claims workflow from upload to submission</small>
            </button>
            <button
              type="button"
              aria-pressed={loginRole === 'doctor'}
              disabled={isAnyLoading || !DOCTOR_PANEL_ENABLED}
              className="disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => selectRole('doctor')}
            >
              <b>Doctor / Staff</b>
              <small>Find patient documents and complete your to-dos</small>
            </button>
          </div>
        </div>

        <GoogleSignInButton
          onClick={handleGoogleSignIn}
          loading={googleAuth.isPending}
          disabled={isAnyLoading}
          tenantId={tenantId}
        />

        <div className="ldivider" role="separator" aria-label="Or continue with email">
          <span>or continue with email</span>
        </div>

        <div className="lfields">
          <label className="lfield" htmlFor="lEmail">
            Work email
            <span className="inp">
              <input
                id="lEmail"
                type="email"
                autoComplete="username"
                placeholder="name@hospital.org"
                value={email}
                disabled={isAnyLoading}
                onChange={(e) => setEmail(e.target.value)}
              />
            </span>
          </label>

          <div className="grid gap-2">
            <PasswordInput
              value={password}
              disabled={isAnyLoading}
              onChange={(e) => setPassword(e.target.value)}
            />
            <div className="flex justify-end">
              <Link to={ROUTES.FORGOT_PASSWORD} className="link small">
                Forgot password?
              </Link>
            </div>
          </div>
        </div>

        {errorMessage ? <ErrorBox message={errorMessage} /> : null}

        <Button
          type="submit"
          variant="pri"
          className="lgo"
          loading={loginMutation.isPending}
          disabled={isAnyLoading}
        >
          {loginMutation.isPending ? (
            'Signing in…'
          ) : (
            <>
              Sign in{' '}
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </>
          )}
        </Button>
      </form>
    </AuthCard>
  )
}
