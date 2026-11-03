import { getIngestionStatusInfo } from '@/constants/statusMaps'

// Mirrors the backend defaults in app/core/settings.py (upload limits).
export const UPLOAD_ACCEPT = '.pdf,.doc,.docx,.txt,.md,.png,.jpg,.jpeg,.csv,.xls,.xlsx,.json,.zip'
export const MAX_FILES_PER_BATCH = 50
export const MAX_BATCH_BYTES = 500 * 1024 * 1024

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg']

function hasExtension(name, extensions) {
  const lower = String(name || '').toLowerCase()
  return extensions.some((ext) => lower.endsWith(ext))
}

/** Stable identity for a picked File, used to drop repeat picks and as a list key. */
export const pickedFileKey = (file) => `${file.name}:${file.size}:${file.lastModified}`

export function formatBytes(bytes) {
  if (typeof bytes !== 'number' || Number.isNaN(bytes)) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function uploadDetail(file, allFiles) {
  switch (file.status) {
    case 'INGESTED': {
      if (file.is_archive) {
        const children = allFiles.filter((f) => f.archive_parent_id === file.file_id).length
        return `ZIP opened: ${children} ${children === 1 ? 'file' : 'files'}, each checked and scanned`
      }
      if (hasExtension(file.original_filename, IMAGE_EXTENSIONS)) {
        return 'Scanned image, text will be read from the picture'
      }
      return 'Stored and verified'
    }
    case 'DUPLICATE': {
      const original = allFiles.find((f) => f.file_id === file.duplicate_of_file_id)
      return original
        ? `Same file as ${original.original_filename}, not stored twice`
        : 'Already uploaded for this patient, not stored twice'
    }
    case 'REJECTED':
      return file.error_message || 'This file type can’t be uploaded'
    case 'UPLOAD_FAILED':
    case 'RETRY_PENDING':
    case 'METADATA_PENDING':
    case 'CANCELLED':
      return file.error_message || 'Couldn’t be stored. It can be tried again in the next step.'
    default:
      return 'Still being processed'
  }
}

/** One backend FileResult → one row of the step 1 results table. */
export function toUploadRow(file, allFiles = []) {
  const { label, tone } = getIngestionStatusInfo(file.status)
  return {
    id: file.file_id,
    name: file.original_filename,
    chip: label,
    tone,
    detail: uploadDetail(file, allFiles),
    sizeText: formatBytes(file.file_size_bytes),
    indent: Boolean(file.archive_parent_id),
  }
}

/** Orders files so each ZIP's children follow it, then maps them to table rows. */
export function toUploadRows(files = []) {
  const ids = new Set(files.map((f) => f.file_id))
  const ordered = []
  files
    .filter((f) => !f.archive_parent_id || !ids.has(f.archive_parent_id))
    .forEach((file) => {
      ordered.push(file)
      if (file.is_archive) {
        ordered.push(...files.filter((f) => f.archive_parent_id === file.file_id))
      }
    })
  return ordered.map((file) => toUploadRow(file, files))
}

/** Batch counts → the six result tiles. */
export function toUploadTiles(counts = {}) {
  return [
    { label: 'received', value: counts.total ?? 0 },
    { label: 'accepted', value: counts.successful ?? 0, color: 'var(--ok)' },
    { label: 'failed', value: counts.failed ?? 0, color: counts.failed ? 'var(--red)' : undefined },
    { label: 'not allowed', value: counts.rejected ?? 0, color: counts.rejected ? 'var(--red)' : undefined },
    { label: 'duplicates', value: counts.duplicate ?? 0, color: counts.duplicate ? 'var(--amb)' : undefined },
    { label: 'in progress', value: counts.pending ?? 0 },
  ]
}

/** API error from upload / batch calls → plain words for the screen. */
export function uploadErrorMessage(error) {
  if (!error) return ''
  switch (error.code) {
    case 'TOO_MANY_FILES':
      return `Up to ${MAX_FILES_PER_BATCH} files per upload. Remove some and try again.`
    case 'BATCH_TOO_LARGE':
      return 'This upload is too large. Split it into smaller batches.'
    case 'IDEMPOTENCY_KEY_REUSED':
    case 'BATCH_IN_PROGRESS':
      return 'This upload is already being processed. Wait a moment, then check the results.'
    case 'NOT_FOUND':
      return 'This upload could not be found.'
    default:
      break
  }
  if (error.status === 403) {
    return 'You don’t have access to this patient’s records.'
  }
  if (error.status === 0) {
    return /timeout/i.test(error.message || '')
      ? 'The upload is taking longer than expected. Check your connection and try again.'
      : 'Couldn’t reach the server. Check your connection and try again.'
  }
  return error.message || 'Upload failed. Please try again.'
}
