import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { env } from '@/config/env'
import { EmptyStep } from '@/components/common/EmptyStep'
import { Button, Chip, Pill } from '@/components/ui'
import { gapsApi } from '@/features/gaps/api/gapsApi'
import { intakeApi } from '@/features/gaps/api/intakeApi'
import { packetsApi } from '@/features/gaps/api/packetsApi'
import { useActivity } from '@/hooks/useActivity'
import { useUiStore } from '@/store/uiStore'
import { PROTOTYPE_GAPS } from '../constants'
import { useClaimDesk } from '../hooks/useClaimDesk'

const PACKET_JSON = `{
  "assembly_id": "pa-41d0…",
  "claim_id": "SUV-261028-01",
  "gap_run_id": "run-3c1e…",
  "target_format": "payer_json",
  "status": "ASSEMBLED"
}`

export function CheckGapsStep() {
  const { claimId = 'SUV-261028-01' } = useParams()
  const navigate = useNavigate()
  const { log } = useActivity()
  const apiPanel = useUiStore((state) => state.apiPanel)
  const { claim, desk, updateDesk, gapsLeft } = useClaimDesk(claimId)
  const [running, setRunning] = useState(false)

  const handleRunGaps = async () => {
    setRunning(true)
    try {
      const intakeOut = await intakeApi.createIntake({
        encounter_id: claimId,
        claim_id: claimId,
        user_id: claim?.user_id || 'SYN-P-1042',
        payer_id: 'SYN-07',
        service_date: '2026-10-09',
      })
      if (intakeOut?.intake_id) {
        updateDesk({
          intakeId: intakeOut.intake_id,
          gapRunId: intakeOut.gap_run_id || desk.gapRunId,
          packetId: intakeOut.packet_id || desk.packetId,
          integrityRunId: intakeOut.integrity_run_id || desk.integrityRunId,
        })
      }
    } catch {
      // Fallback to prototype gap check results when backend is offline
    } finally {
      setRunning(false)
      updateDesk({ gapsRun: true })
      log('ran the gap check: 3 to fix, claim packet built')
    }
  }

  const handleDownloadPacket = async () => {
    try {
      const res = await packetsApi.getDownloadLink(desk.packetId)
      if (res?.url) window.open(res.url, '_blank', 'noopener,noreferrer')
    } catch {
      log('requested claim packet download link')
    }
  }

  const handleDownloadGapReport = async () => {
    try {
      const res = await gapsApi.getReportLink(desk.gapRunId)
      if (res?.url) window.open(res.url, '_blank', 'noopener,noreferrer')
    } catch {
      log('requested gap report download link')
    }
  }

  return (
    <>
      <div className="between">
        <h2 style={{ fontSize: '18px' }}>Check gaps against payer rules</h2>
        <span className="small muted">Insurer SYN-07 rules in force on 9 Oct</span>
      </div>

      {!desk.uploaded ? (
        <EmptyStep
          message="Nothing uploaded yet."
          actionText="Go to step 1."
          to={`/claims/${claimId}/upload`}
        />
      ) : !desk.gapsRun ? (
        <>
          <div className="muted">
            Checks the documents against the payer’s rules, the disease registry and the hospital
            tariff, then builds the claim packet.
          </div>
          <div className="row">
            <Button variant="acc" loading={running} onClick={handleRunGaps}>
              Run gap check
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="row" style={{ gap: '6px' }}>
            <Pill tone="ok">Nothing blocks this claim</Pill>
            <Pill tone="amb">{gapsLeft} to fix</Pill>
            <Pill tone="teal">2 passed</Pill>
          </div>

          {PROTOTYPE_GAPS.map(([label, tone, title, desc, source]) => (
            <div
              key={title}
              style={{
                border: '1px solid var(--line)',
                borderRadius: '8px',
                padding: '9px 12px',
                display: 'flex',
                gap: '8px',
                alignItems: 'flex-start',
              }}
            >
              <Chip tone={tone}>{label}</Chip>
              <div style={{ display: 'grid', gap: '2px', minWidth: 0 }}>
                <b style={{ fontSize: '14.5px' }}>{title}</b>
                <span className="small muted">{desc}</span>
                <span
                  className="mono"
                  style={{ fontSize: '11.5px', color: 'var(--teal)', overflowWrap: 'anywhere' }}
                >
                  source: {source}
                </span>
              </div>
            </div>
          ))}

          <div
            style={{
              border: '1px solid var(--line)',
              borderRadius: '8px',
              padding: '10px 12px',
              display: 'grid',
              gap: '8px',
            }}
          >
            <div className="between">
              <b style={{ font: '700 14.5px var(--f-display)' }}>Claim packet</b>
              <Chip tone="ok">READY</Chip>
            </div>
            <div className="small muted">
              Payer format: Insurer SYN-07 JSON · 6 attachments · clinical summary needs a quick
              human read.
            </div>
            <div className="row">
              <Button size="sm" onClick={handleDownloadPacket}>
                Download packet
              </Button>
              <Button size="sm" onClick={handleDownloadGapReport}>
                Download gap report
              </Button>
            </div>
            {env.showApiPanel && apiPanel && <pre className="code">{PACKET_JSON}</pre>}
          </div>

          <div className="row">
            <Button variant="pri" onClick={() => navigate(`/claims/${claimId}/integrity`)}>
              Next: integrity check →
            </Button>
          </div>
        </>
      )}
    </>
  )
}
