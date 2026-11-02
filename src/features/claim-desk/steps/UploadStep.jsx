import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Chip, DataTable, Tile, TileGrid } from '@/components/ui'
import { ingestionApi } from '@/features/ingestion/api/ingestionApi'
import { useActivity } from '@/hooks/useActivity'
import { useClaimDesk } from '../hooks/useClaimDesk'

const PICKED_DEMO_FILES = [
  ['claim_docs.zip', '6 files · 4.8 MB'],
  ['discharge_summary (1).pdf', '412 KB'],
  ['tariff_tool.exe', '1.1 MB'],
]

const UPLOAD_RESULT_TILES = [
  ['received', '9', ''],
  ['accepted', '7', 'var(--ok)'],
  ['failed', '0', ''],
  ['not allowed', '1', 'var(--red)'],
  ['duplicates', '1', 'var(--amb)'],
  ['in progress', '0', ''],
]

const UPLOAD_RESULT_ROWS = [
  {
    id: 'r1',
    name: 'claim_docs.zip',
    tone: 'ok',
    label: 'ACCEPTED',
    detail: 'ZIP opened: 6 files, all scanned',
    size: '4.8 MB',
    indent: false,
  },
  {
    id: 'r2',
    name: 'opd_consultation.pdf',
    tone: 'ok',
    label: 'ACCEPTED',
    detail: 'Stored and verified',
    size: '188 KB',
    indent: true,
  },
  {
    id: 'r3',
    name: 'usg_abdomen.pdf',
    tone: 'ok',
    label: 'ACCEPTED',
    detail: 'Stored and verified',
    size: '240 KB',
    indent: true,
  },
  {
    id: 'r4',
    name: 'operation_note.pdf',
    tone: 'ok',
    label: 'ACCEPTED',
    detail: 'Stored and verified',
    size: '302 KB',
    indent: true,
  },
  {
    id: 'r5',
    name: 'anaesthesia_record.jpg',
    tone: 'ok',
    label: 'ACCEPTED',
    detail: 'Scanned image, text will be read from the picture',
    size: '2.9 MB',
    indent: true,
  },
  {
    id: 'r6',
    name: 'discharge_summary.pdf',
    tone: 'ok',
    label: 'ACCEPTED',
    detail: 'Stored and verified',
    size: '412 KB',
    indent: true,
  },
  {
    id: 'r7',
    name: 'final_bill.xlsx',
    tone: 'ok',
    label: 'ACCEPTED',
    detail: '2 sheets, tables kept',
    size: '96 KB',
    indent: true,
  },
  {
    id: 'r8',
    name: 'discharge_summary (1).pdf',
    tone: 'amb',
    label: 'DUPLICATE',
    detail: 'Same file as discharge_summary.pdf, not stored twice',
    size: '412 KB',
    indent: false,
  },
  {
    id: 'r9',
    name: 'tariff_tool.exe',
    tone: 'red',
    label: 'NOT ALLOWED',
    detail: 'Program files can’t be uploaded',
    size: '1.1 MB',
    indent: false,
  },
]

export function UploadStep() {
  const { claimId = 'SUV-261028-01' } = useParams()
  const navigate = useNavigate()
  const { log } = useActivity()
  const { claim, desk, updateDesk, resetDesk } = useClaimDesk(claimId)
  const [uploading, setUploading] = useState(false)

  const handleUpload = async () => {
    setUploading(true)
    try {
      const response = await ingestionApi.upload({
        files: [],
        userId: claim?.user_id || 'SYN-P-1042',
      })
      if (response?.batch_id) {
        updateDesk({ batchId: response.batch_id })
      }
    } catch {
      // Fallback to demo state when backend is offline or no real File objects selected
    } finally {
      setUploading(false)
      updateDesk({ uploaded: true })
      log('uploaded batch: 7 ingested, 1 duplicate, 1 rejected')
    }
  }

  const columns = [
    {
      key: 'name',
      header: 'FILE',
      render: (row) => (
        <span
          style={{
            fontWeight: 600,
            overflowWrap: 'anywhere',
            paddingLeft: row.indent ? '26px' : undefined,
          }}
        >
          {row.indent ? '↳ ' : ''}
          {row.name}
        </span>
      ),
    },
    {
      key: 'label',
      header: 'RESULT',
      render: (row) => <Chip tone={row.tone}>{row.label}</Chip>,
    },
    {
      key: 'detail',
      header: 'DETAIL',
      cellClassName: 'small muted',
    },
    {
      key: 'size',
      header: 'SIZE',
      num: true,
      cellClassName: 'mono small muted',
    },
  ]

  return (
    <>
      <div className="between">
        <h2 style={{ fontSize: '18px' }}>Upload claim documents</h2>
      </div>

      {!desk.uploaded ? (
        <>
          <div
            style={{
              border: '2px dashed var(--line)',
              borderRadius: '10px',
              background: 'var(--tint)',
              padding: '18px',
              display: 'grid',
              gap: '10px',
            }}
          >
            <div className="row" style={{ gap: '8px 14px' }}>
              <b>Drop files or a ZIP here</b>
              <span className="small muted">
                PDF, Word, Excel, CSV, JSON and images. ZIP files are opened and every file is
                checked and virus-scanned.
              </span>
              <Button size="sm" style={{ marginLeft: 'auto' }}>
                Choose files
              </Button>
            </div>
            {PICKED_DEMO_FILES.map(([fileName, fileSize]) => (
              <div
                key={fileName}
                className="between"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--line)',
                  borderRadius: '6px',
                  padding: '7px 10px',
                  fontSize: '14px',
                }}
              >
                <b style={{ fontWeight: 600, overflowWrap: 'anywhere' }}>{fileName}</b>
                <span className="mono small muted">{fileSize}</span>
              </div>
            ))}
          </div>

          <div className="row">
            <Button variant="acc" loading={uploading} onClick={handleUpload}>
              Upload 3 items
            </Button>
            <span className="small muted">
              Files are stored securely and read automatically after upload.
            </span>
          </div>
        </>
      ) : (
        <>
          <TileGrid>
            {UPLOAD_RESULT_TILES.map(([label, value, color]) => (
              <Tile
                key={label}
                label={label}
                value={value}
                valueColor={color || undefined}
              />
            ))}
          </TileGrid>

          <DataTable columns={columns} rows={UPLOAD_RESULT_ROWS} minWidth={640} />

          <div className="row">
            <Button
              variant="pri"
              onClick={() => navigate(`/claims/${claimId}/read`)}
            >
              Next: read documents →
            </Button>
            <Button onClick={resetDesk}>↺ Start over</Button>
          </div>
        </>
      )}
    </>
  )
}
