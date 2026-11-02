import { createBrowserRouter, Navigate } from 'react-router-dom'
import { DOCTOR_PANEL_ENABLED } from '@/constants/navigation'
import { ROLES } from '@/constants/permissions'
import { ROUTES } from '@/constants/routes'
import { AppShell } from '@/components/layout/AppShell'
import { ForgotPasswordPage } from '@/features/auth/pages/ForgotPasswordPage'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { MfaPage } from '@/features/auth/pages/MfaPage'
import { ResetPasswordPage } from '@/features/auth/pages/ResetPasswordPage'
import { ClaimDeskLayout } from '@/features/claim-desk/pages/ClaimDeskLayout'
import { ClaimsWorklistPage } from '@/features/claims/pages/ClaimsWorklistPage'
import { UsersPage } from '@/features/users/pages/UsersPage'
import {
  FoundationShowcasePage,
  RoutePlaceholderPage,
} from '@/pages/FoundationShowcasePage'
import { PublicOnly, RequireAuth, RequireRole } from './guards'

// Doctor / Staff routes are kept in code and disabled via DOCTOR_PANEL_ENABLED while Admin APIs are integrated
const doctorAndStaffRoutes = DOCTOR_PANEL_ENABLED
  ? [
      {
        path: ROUTES.DOCUMENTS,
        element: (
          <RoutePlaceholderPage
            screenId="S05 — Doctor / Staff"
            title="Patient documents"
            apis={[
              ['GET', '/api/v1/ingestion/files/{file_id}', 'READY', 'Document status, pages, scanned'],
              ['POST', '/api/v1/rag/search', 'READY', 'Search inside documents'],
              ['GET', '/api/v1/files?patient=&type=&status=', 'NEEDED', 'Document list for this table'],
            ]}
          />
        ),
      },
      {
        path: ROUTES.ASK,
        element: (
          <RoutePlaceholderPage
            screenId="S06 — Doctor / Staff"
            title="Ask about a patient"
            apis={[
              ['POST', '/api/v1/rag/ask', 'READY', 'Answer with sources'],
              ['POST', '/api/v1/rag/search', 'READY', 'Ranked passages only'],
              ['POST', '/api/v1/evaluation/evaluate', 'READY', 'Answer check: grounded, relevance, safety'],
            ]}
          />
        ),
      },
      {
        path: ROUTES.PATIENT_SUMMARY,
        element: (
          <RoutePlaceholderPage
            screenId="S07 — Doctor / Staff"
            title="Patient summary"
            apis={[
              ['GET', '/api/v1/patients/{user_id}', 'NEEDED', 'Patient header: sex, age, diagnosis, doctor'],
              ['GET', '/api/v1/patients/{user_id}/timeline', 'NEEDED', 'Timeline events with sources'],
            ]}
          />
        ),
      },
      {
        path: ROUTES.TODOS,
        element: (
          <RoutePlaceholderPage
            screenId="S08 — Doctor / Staff"
            title="My to-dos"
            apis={[
              ['GET', '/api/v1/claims/gap-reports/{gap_report_id}', 'READY', 'Gap report sent back to this user'],
              ['GET', '/api/v1/tasks?assignee=me', 'NEEDED', 'To-do list: owner, status, due'],
              ['POST', '/api/v1/tasks/{task_id}/resolve', 'NEEDED', 'Mark done with a note'],
            ]}
          />
        ),
      },
    ]
  : []

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
        element: <Navigate to={ROUTES.CLAIMS} replace />,
      },
      {
        path: '/foundation',
        element: <FoundationShowcasePage />,
      },
      {
        element: <RequireRole roles={[ROLES.ADMIN, ROLES.COMPLIANCE]} />,
        children: [
          {
            path: ROUTES.CLAIMS,
            element: <ClaimsWorklistPage />,
          },
          {
            path: ROUTES.CLAIM_DESK,
            element: <ClaimDeskLayout />,
          },
          {
            path: ROUTES.USERS,
            element: <UsersPage />,
          },
        ],
      },
      ...doctorAndStaffRoutes,
      {
        path: '*',
        element: <Navigate to={ROUTES.CLAIMS} replace />,
      },
    ],
  },
])
