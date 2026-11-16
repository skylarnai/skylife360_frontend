import { Button, Chip, Note } from '@/components/ui'
import { env } from '@/config/env'
import { gapsApi } from '../api/gapsApi'
import { packetsApi } from '../api/packetsApi'

/**
 * Claim Packet Card (GAP-06)
 * Displays assembled packet outcome, target format, and presigned download actions.
 */
export function PacketCard({ packet, gapRunId, apiPanel = false }) {
  if (!packet) return null

  const outcome = packet.assembly_outcome || 'SUBMISSION_READY'
  const isReady = outcome === 'SUBMISSION_READY'
  const isQuarantined = outcome === 'QUARANTINED'
  const isRejected = outcome === 'REJECTED_GAPS'

  const tone = isReady ? 'ok' : isQuarantined ? 'amb' : 'red'
  const statusLabel = isReady ? 'READY' : isQuarantined ? 'NEEDS REVIEW' : 'BLOCKED'

  const handleDownloadPacket = async () => {
    try {
      const res = await packetsApi.getDownloadLink(packet.assembly_id || packet.packet_id)
      if (res?.url) window.open(res.url, '_blank', 'noopener,noreferrer')
    } catch {
      // Fallback
    }
  }

  const handleDownloadGapReport = async () => {
    if (!gapRunId) return
    try {
      const res = await gapsApi.getReportLink(gapRunId)
      if (res?.url) window.open(res.url, '_blank', 'noopener,noreferrer')
    } catch {
      // Fallback
    }
  }

  return (
    <div
      style={{
        border: '1px solid var(--line)',
        borderRadius: '8px',
        padding: '12px 14px',
        display: 'grid',
        gap: '8px',
        background: 'var(--panel)',
      }}
    >
      <div className="between">
        <b style={{ font: '700 14.5px var(--f-display)' }}>Claim Packet</b>
        <Chip tone={tone}>{statusLabel}</Chip>
      </div>

      <div className="small muted">
        Payer format: <b>{packet.target_format || 'Payer JSON'}</b>
        {packet.split_count ? ` · ${packet.split_count} payload parts` : ''}
        {isReady && ' · All clinical sections and attachments prepared.'}
      </div>

      {isQuarantined && (
        <Note>
          Some clinical sections contain unmapped codes or required manual review before transmission.
        </Note>
      )}

      {isRejected && (
        <Note>
          The claim packet could not be assembled due to hard blocking rule violations. Download the gap report below.
        </Note>
      )}

      <div className="row" style={{ gap: '8px', marginTop: '4px' }}>
        {!isRejected && (
          <Button size="sm" variant="pri" onClick={handleDownloadPacket}>
            Download packet
          </Button>
        )}
        <Button size="sm" onClick={handleDownloadGapReport}>
          Download gap report
        </Button>
      </div>

      {env.showApiPanel && apiPanel && (
        <pre className="code" style={{ marginTop: '6px' }}>
          {JSON.stringify(
            {
              assembly_id: packet.assembly_id,
              assembly_outcome: packet.assembly_outcome,
              target_format: packet.target_format,
              is_split: packet.is_split,
            },
            null,
            2
          )}
        </pre>
      )}
    </div>
  )
}

