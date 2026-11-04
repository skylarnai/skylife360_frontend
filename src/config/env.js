export const env = {
  appName: import.meta.env.VITE_APP_NAME || 'Sky Claims Desk',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '',
  proxyTarget: import.meta.env.VITE_PROXY_TARGET || 'http://127.0.0.1:8000',
  apiPrefix: import.meta.env.VITE_API_PREFIX || '/api/v1',
  // Ask (RAG answers) needs an LLM on the backend; off until one is configured.
  enableAsk: String(import.meta.env.VITE_ENABLE_ASK).toLowerCase() === 'true',
  showApiPanel: String(import.meta.env.VITE_SHOW_API_PANEL).toLowerCase() === 'true',
  defaultTenantId: import.meta.env.VITE_DEFAULT_TENANT_ID || 'HOSP-001',
}

