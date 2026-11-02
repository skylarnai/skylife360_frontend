export const ROUTES = {
  ROOT: '/',
  LOGIN: '/login',
  LOGIN_MFA: '/login/mfa',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  CLAIMS: '/claims',
  CLAIM_DESK: '/claims/:claimId/:step',
  CLAIM_DESK_DEFAULT: '/claims/SUV-261028-01/upload',
  USERS: '/users',
  DOCUMENTS: '/documents',
  ASK: '/ask',
  PATIENT_SUMMARY: '/patients/:patientId',
  PATIENT_DEFAULT: '/patients/SYN-P-1042',
  TODOS: '/todos',
}

export function getLandingRoute(role) {
  const normalized = String(role || '').toUpperCase()
  if (normalized === 'ADMIN' || normalized === 'COMPLIANCE') {
    return ROUTES.CLAIMS
  }
  return ROUTES.DOCUMENTS
}
