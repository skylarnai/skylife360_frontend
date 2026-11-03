import { Chip, DataTable, Tile, TileGrid } from '@/components/ui'
import { toUploadRows, toUploadTiles } from '../utils/fileResultView'

const COLUMNS = [
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

/** Count tiles + per-file results for one upload batch (also reusable by S05). */
export function UploadResultsTable({ batch, loading = false }) {
  const tiles = toUploadTiles(batch?.counts)
  const rows = toUploadRows(batch?.files)

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
        columns={COLUMNS}
        rows={rows}
        loading={loading}
        emptyMessage="No files in this upload."
        minWidth={640}
      />
    </>
  )
}
