export const env = {
  appName: import.meta.env.VITE_APP_NAME || 'Sky Claims Desk',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '',
  proxyTarget: import.meta.env.VITE_PROXY_TARGET || 'http://127.0.0.1:8000',
  apiPrefix: import.meta.env.VITE_API_PREFIX || '/api/v1',
  showApiPanel: String(import.meta.env.VITE_SHOW_API_PANEL).toLowerCase() === 'true',
  authMock: String(import.meta.env.VITE_AUTH_MOCK || 'false').toLowerCase() === 'true',
  mockRole: (import.meta.env.VITE_MOCK_ROLE || 'admin').toLowerCase(),
}

