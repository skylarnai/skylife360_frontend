import { Button, Chip, DataTable, Tile, TileGrid } from '@/components/ui'
import { toUploadRows, toUploadTiles } from '../utils/fileResultView'

const BASE_COLUMNS = [
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
    key: 'chip',
    header: 'RESULT',
    render: (row) => <Chip tone={row.tone}>{row.chip}</Chip>,
  },
  {
    key: 'detail',
    header: 'DETAIL',
    cellClassName: 'small muted',
  },
  {
    key: 'sizeText',
    header: 'SIZE',
    num: true,
    cellClassName: 'mono small muted',
  },
]

/**
 * Count tiles + per-file results for a claim's documents (or one upload batch).
 * Pass onOpen / onRemove to show the row actions.
 */
export function UploadResultsTable({
  batch,
  loading = false,
  onOpen,
  onRemove,
  openingId = null,
  removingId = null,
}) {
  const tiles = toUploadTiles(batch?.counts)
  const rows = toUploadRows(batch?.files)

  const columns =
    onOpen || onRemove
      ? [
          ...BASE_COLUMNS,
          {
            key: 'actions',
            header: '',
            render: (row) => (
              <div className="row" style={{ gap: '6px', flexWrap: 'nowrap', justifyContent: 'flex-end' }}>
                {onOpen && row.canOpen && (
                  <Button size="sm" loading={openingId === row.id} onClick={() => onOpen(row)}>
                    Open
                  </Button>
                )}
                {onRemove && row.canRemove && (
                  <Button
                    size="sm"
                    loading={removingId === row.id}
                    disabled={Boolean(removingId)}
                    onClick={() => onRemove(row)}
                    aria-label={`Remove ${row.name} from this claim`}
                  >
                    Remove
                  </Button>
                )}
              </div>
            ),
          },
        ]
      : BASE_COLUMNS

  return (
    <>
      <TileGrid>
        {tiles.map((tile) => (
          <Tile
            key={tile.label}
            label={tile.label}
            value={loading ? '…' : String(tile.value)}
            valueColor={loading ? undefined : tile.color}
          />
        ))}
      </TileGrid>
      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        emptyMessage="No documents on this claim yet."
        minWidth={onOpen || onRemove ? 760 : 640}
      />
    </>
  )
}
