import { useQuery } from '@tanstack/react-query'
import { packetsApi } from '../api/packetsApi'

export const packetQueryKey = (packetId) => ['claim-packet', packetId]

/**
 * Loads Claim Packet assembly status, target format, and sections.
 */
export function usePacket(packetId) {
  return useQuery({
    queryKey: packetQueryKey(packetId),
    queryFn: () => packetsApi.getAssembly(packetId),
    enabled: Boolean(packetId),
  })
}

