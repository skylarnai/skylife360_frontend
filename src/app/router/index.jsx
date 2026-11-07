import { createBrowserRouter, Navigate } from 'react-router-dom'
import { DOCTOR_PANEL_ENABLED } from '@/constants/navigation'
import { CLAIM_DESK_PERMISSIONS, PERMISSIONS } from '@/constants/permissions'
import { getLandingRoute, ROUTES } from '@/constants/routes'
import { AppShell } from '@/components/layout/AppShell'
import { ForgotPasswordPage } from '@/features/auth/pages/ForgotPasswordPage'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { MfaPage } from '@/features/auth/pages/MfaPage'
import { ResetPasswordPage } from '@/features/auth/pages/ResetPasswordPage'
import { ClaimDeskLayout } from '@/features/claim-desk/pages/ClaimDeskLayout'
import { ClaimsWorklistPage } from '@/features/claims/pages/ClaimsWorklistPage'
import { UsersPage } from '@/features/users/pages/UsersPage'
import { PatientDocumentsPage } from '@/features/documents/pages/PatientDocumentsPage'
import { PatientSummaryPage } from '@/features/patients/pages/PatientSummaryPage'
import { AskPatientPage } from '@/features/rag/pages/AskPatientPage'
import { MyTodosPage } from '@/features/tasks/pages/MyTodosPage'
import { FoundationShowcasePage } from '@/pages/FoundationShowcasePage'
import { useSessionStore } from '@/store/sessionStore'
import { PublicOnly, RequireAuth, RequirePermission } from './guards'

// Doctor / Staff screens (S05–S08). Admins can open them too (docs:read); actions are gated by permission.
const doctorAndStaffRoutes = DOCTOR_PANEL_ENABLED
  ? [
      { path: ROUTES.DOCUMENTS, element: <PatientDocumentsPage /> },
      { path: ROUTES.ASK, element: <AskPatientPage /> },
      { path: ROUTES.PATIENT_SUMMARY, element: <PatientSummaryPage /> },
      { path: ROUTES.TODOS, element: <MyTodosPage /> },
    ]
  : []

function LandingRedirect() {
  const role = useSessionStore((state) => state.role)
  const target = DOCTOR_PANEL_ENABLED ? getLandingRoute(role) : ROUTES.CLAIMS
  return <Navigate to={target} replace />
}

export const router = createBrowserRouter([
  {
    element: <PublicOnly />,
    children: [
      {
        path: ROUTES.LOGIN,
        element: <LoginPage />,
      },
      {
        path: ROUTES.LOGIN_MFA,
        element: <MfaPage />,
      },
      {
        path: ROUTES.FORGOT_PASSWORD,
        element: <ForgotPasswordPage />,
      },
      {
        path: ROUTES.RESET_PASSWORD,
        element: <ResetPasswordPage />,
      },
      {
        path: ROUTES.RESET_PASSWORD_WITH_TOKEN,
        element: <ResetPasswordPage />,
      },
    ],
  },
  {
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [
      {
        path: ROUTES.ROOT,
        element: <LandingRedirect />,
      },
      {
        path: '/foundation',
        element: <FoundationShowcasePage />,
      },
      {
        // Admins, plus anyone an admin gave a reviewer permission (claims:approve, claims:submit,
        // integrity:view, integrity:clear). Each action inside is gated by its own permission.
        element: <RequirePermission anyOf={CLAIM_DESK_PERMISSIONS} allowAdmin />,
        children: [
          {
            path: ROUTES.CLAIMS,
            element: <ClaimsWorklistPage />,
          },
          {
            path: ROUTES.CLAIM_DESK,
            element: <ClaimDeskLayout />,
          },
        ],
      },
      {
        element: <RequirePermission anyOf={[PERMISSIONS.USERS_MANAGE]} />,
        children: [
          {
            path: ROUTES.USERS,
            element: <UsersPage />,
          },
        ],
      },
      ...doctorAndStaffRoutes,
      {
        path: '*',
        element: <LandingRedirect />,
      },
    ],
  },
])
