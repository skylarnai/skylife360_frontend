import { httpClient } from '@/services/api/httpClient'

const enc = encodeURIComponent

/**
 * The claim at the payer (backend payer_gateway) and the mock insurer (backend mock_payer).
 * POSTs under /claims/submissions get an Idempotency-Key from httpClient automatically.
 */
export const payerApi = {
  /**
   * GET /api/v1/claims/submissions/{id}/payer-status (READY)
   * → { status, status_label, is_mock, is_final, claim_type, payer_claim_reference, claimed_amount,
   *     approved_amount, decision_lines[], required_actions[], query_due_at, expected_by, settlement,
   *     actions: { respond_to_query, appeal, withdraw } }
   * 404 PAYER_STATUS_NOT_FOUND until the payer acknowledges the submission.
   */
  async getPayerStatus(submissionId) {
    const { data } = await httpClient.get(`/claims/submissions/${enc(submissionId)}/payer-status`)
    return data
  },

  /** POST /api/v1/claims/submissions/{id}/payer-status/refresh (READY): ask the payer now. */
  async refreshPayerStatus(submissionId) {
    const { data } = await httpClient.post(
      `/claims/submissions/${enc(submissionId)}/payer-status/refresh`,
    )
    return data
  },

  /** POST .../query-response { documents[], note } (claims:submit): answer a QUERY_RAISED claim. */
  async respondToQuery(submissionId, { documents = [], note }) {
    const { data } = await httpClient.post(
      `/claims/submissions/${enc(submissionId)}/query-response`,
      { documents, ...(note ? { note } : {}) },
    )
    return data
  },

  /** POST .../appeal { notes, documents[] } (claims:submit). 409 APPEAL_LIMIT_REACHED. */
  async appeal(submissionId, { notes, documents = [] }) {
    const { data } = await httpClient.post(`/claims/submissions/${enc(submissionId)}/appeal`, {
      notes,
      documents,
    })
    return data
  },

  /** POST .../withdraw { reason } (claims:submit): cancel the claim at the payer before settlement. */
  async withdraw(submissionId, reason) {
    const { data } = await httpClient.post(`/claims/submissions/${enc(submissionId)}/withdraw`, {
      reason,
    })
    return data
  },

  /**
   * POST /api/v1/claims/submissions/precheck (claims:submit): nothing is sent or stored.
   * Body: the POST /claims/submissions body. → { expected_decision, claimed_amount, expected_payable,
   *   issues[], documents_to_add[], policy_known, mock_payer, model: { band, ... } | null }
   */
  async precheck(body) {
    const { data } = await httpClient.post('/claims/submissions/precheck', body)
    return data
  },

  // --- Mock insurer (404 MOCK_PAYER_DISABLED when off; never in production) ---------------------

  /** GET /api/v1/mock-payer/scenarios → { scenarios: [{ name, description }] } */
  async getScenarios() {
    const { data } = await httpClient.get('/mock-payer/scenarios')
    return data
  },

  /** GET /api/v1/mock-payer/admin/payers (admin) → { payers: [...] } */
  async listMockPayers() {
    const { data } = await httpClient.get('/mock-payer/admin/payers')
    return data
  },

  /** POST /api/v1/mock-payer/admin/payers (admin): create / update an insurer. */
  async upsertMockPayer(body) {
    const { data } = await httpClient.post('/mock-payer/admin/payers', body)
    return data
  },

  /** POST /api/v1/mock-payer/admin/policies (admin): a test policy (member_ref = patient ID). */
  async createMockPolicy(body) {
    const { data } = await httpClient.post('/mock-payer/admin/policies', body)
    return data
  },

  /** GET /api/v1/mock-payer/admin/policies/{policy_number} (admin) */
  async getMockPolicy(policyNumber) {
    const { data } = await httpClient.get(`/mock-payer/admin/policies/${enc(policyNumber)}`)
    return data
  },

  /** POST /api/v1/mock-payer/admin/endpoints (admin): route a claim payer_code to a mock insurer. */
  async connectEndpoint(body) {
    const { data } = await httpClient.post('/mock-payer/admin/endpoints', body)
    return data
  },

  /** POST /api/v1/mock-payer/admin/worker/run (admin): review / settle / call back what is due now. */
  async runWorker() {
    const { data } = await httpClient.post('/mock-payer/admin/worker/run')
    return data
  },
}
