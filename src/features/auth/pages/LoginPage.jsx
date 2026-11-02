import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { env } from '@/config/env'
import { ROUTES } from '@/constants/routes'
import { Button } from '@/components/ui/Button'
import { ErrorBox } from '@/components/ui/ErrorBox'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { DEMO_USERS } from '@/services/auth/authApi'
import { AuthCard } from '../components/AuthCard'
import { DemoAccounts } from '../components/DemoAccounts'
import { PasswordInput } from '../components/PasswordInput'
import { mapAuthErrorMessage, useLogin } from '../hooks/useLogin'
import { loginSchema } from '../schemas/loginSchema'

export function LoginPage() {
  useDocumentTitle('Sign in')
  const passwordInputRef = useRef(null)
  const loginMutation = useLogin()

  // Doctor / Staff panel is temporarily disabled while focusing on Admin workflow & APIs
  const [loginRole] = useState('admin')
  const defaultEmail = env.showApiPanel
    ? env.authMock
      ? 'a.rao@suvidha.demo'
      : 'superadmin@hosp.org'
    : ''
  const defaultPassword = env.showApiPanel
    ? env.authMock
      ? 'demo1234'
      : 'SecurePass123!'
    : ''

  const [email, setEmail] = useState(defaultEmail)
  const [password, setPassword] = useState(defaultPassword)
  const [validationError, setValidationError] = useState('')

  const handleFillDemo = (demoEmail) => {
    setEmail(demoEmail)
    if (env.showApiPanel) {
      setPassword(env.authMock ? 'demo1234' : 'SecurePass123!')
    }
    setValidationError('')
    loginMutation.reset()
    setTimeout(() => {
      passwordInputRef.current?.focus()
    }, 0)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setValidationError('')

    const parsed = loginSchema.safeParse({ email, password })
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]?.message
      setValidationError(firstIssue || 'Enter your work email and password to continue.')
      return
    }

    const normalizedEmail = parsed.data.email.toLowerCase()
    if (env.authMock) {
      const matchedDemo = Object.values(DEMO_USERS).find(
        (u) => u.user.email.toLowerCase() === normalizedEmail
      )
      if (matchedDemo && matchedDemo.role !== 'ADMIN') {
        setValidationError(
          'Doctor / Staff panel is currently disabled while we complete the Admin workflow APIs. Please sign in with an Admin account.'
        )
        return
      }
    }

    loginMutation.mutate({
      email: normalizedEmail,
      password: parsed.data.password,
    })
  }

  const errorMessage =
    validationError || (loginMutation.isError ? mapAuthErrorMessage(loginMutation.error) : '')

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

        <div className="lgroup">
          <span className="lbl">I’m signing in as</span>
          <div className="seg" role="group" aria-label="Role">
            <button
              type="button"
              aria-pressed={loginRole === 'admin'}
              disabled={loginMutation.isPending}
            >
              <b>Admin</b>
              <small>Run the claims workflow from upload to submission</small>
            </button>
            <button
              type="button"
              aria-pressed={false}
              disabled
              className="disabled:cursor-not-allowed disabled:opacity-50"
              title="Doctor / Staff panel is disabled until Admin API integration is complete"
            >
              <b>Doctor / Staff</b>
              <small>Find patient documents and complete your to-dos</small>
            </button>
          </div>
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
                disabled={loginMutation.isPending}
                onChange={(e) => setEmail(e.target.value)}
              />
            </span>
          </label>

          <div className="grid gap-2">
            <PasswordInput
              ref={passwordInputRef}
              value={password}
              disabled={loginMutation.isPending}
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

        <DemoAccounts
          onSelectAccount={handleFillDemo}
          disabled={loginMutation.isPending}
        />
      </form>
    </AuthCard>
  )
}
