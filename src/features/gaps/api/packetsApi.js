import { httpClient } from '@/services/api/httpClient'

export const packetsApi = {
  /**
   * POST /api/v1/claims/packets/assemble (READY)
   * Build the packet from gap_run_id + subscriber, provider, billing
   */
  async assemble(payload) {
    const { data } = await httpClient.post('/claims/packets/assemble', payload, {
      idempotent: true,
    })
    return data
  },

  /**
   * GET /api/v1/claims/packets/assemblies/{assembly_id} (READY)
   * Packet status, format, attachments
   */
  async getAssembly(assemblyId) {
    const { data } = await httpClient.get(`/claims/packets/assemblies/${assemblyId}`)
    return data
  },

  /**
   * GET /api/v1/claims/packets/assemblies/{assembly_id}/download (READY)
   * Packet download link
   */
  async getDownloadLink(assemblyId) {
    const { data } = await httpClient.get(`/claims/packets/assemblies/${assemblyId}/download`)
    return data
  },
}
