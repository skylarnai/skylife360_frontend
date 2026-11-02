import { httpClient } from '@/services/api/httpClient'

export const integrityApi = {
  /**
   * POST /api/v1/integrity/check (READY)
   * { packet_id } · 202 with run_id
   */
  async requestCheck(packetId) {
    const { data } = await httpClient.post('/integrity/check', {
      packet_id: packetId,
    })
    return data
  },

  /**
   * GET /api/v1/integrity/runs/{run_id} (READY)
   * Poll: checks[] with check_type, result_flag, summary
   */
  async getRun(runId) {
    const { data } = await httpClient.get(`/integrity/runs/${runId}`)
    return data
  },

  /**
   * GET /api/v1/integrity/checks/{packet_id} (READY)
   * Latest run for a packet
   */
  async getLatestForPacket(packetId) {
    const { data } = await httpClient.get(`/integrity/checks/${packetId}`)
    return data
  },

  /**
   * GET /api/v1/integrity/files/{file_id} (READY)
   * Forensics of one upload
   */
  async getFileForensics(fileId) {
    const { data } = await httpClient.get(`/integrity/files/${fileId}`)
    return data
  },
}
