export const env = {
  appName: import.meta.env.VITE_APP_NAME || 'Sky Claims Desk',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '',
  apiPrefix: import.meta.env.VITE_API_PREFIX || '/api/v1',
  showApiPanel: String(import.meta.env.VITE_SHOW_API_PANEL).toLowerCase() === 'true',
  authMock: String(import.meta.env.VITE_AUTH_MOCK ?? 'true').toLowerCase() !== 'false',
  mockRole: (import.meta.env.VITE_MOCK_ROLE || 'admin').toLowerCase(),
}
