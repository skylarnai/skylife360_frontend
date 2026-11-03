import { getExtractionStatusInfo, getIngestionStatusInfo } from '@/constants/statusMaps'

// Mirrors the backend defaults in app/core/settings.py (upload limits).
export const UPLOAD_ACCEPT =
  '.pdf,.doc,.docx,.txt,.md,.png,.jpg,.jpeg,.tif,.tiff,.csv,.xls,.xlsx,.json,.zip'
export const MAX_FILES_PER_BATCH = 50
export const MAX_BATCH_BYTES = 500 * 1024 * 1024

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.tif', '.tiff']

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
      const originalName =
        file.duplicate_of_filename ||
        allFiles.find((f) => f.file_id === file.duplicate_of_file_id)?.original_filename
      return originalName
        ? `Same file as ${originalName}, not stored twice`
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
    // Only stored files can be opened; ZIP children are removed together with their archive.
    canOpen: file.status === 'INGESTED' && !file.is_archive,
    canRemove: !file.archive_parent_id,
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
    case 'CLAIM_PATIENT_MISMATCH':
      return 'These files are for a different patient than this claim.'
    case 'CLAIM_ALREADY_EXISTS':
      return 'A claim with this ID already exists.'
    case 'NOT_FOUND':
      return error.message || 'This could not be found.'
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

/**
 * Maps a stored file extraction summary to display values for Step 2 (Read Documents).
 */
export function toReadRow(file) {
  const extraction = file.extraction || {}
  const statusInfo = getExtractionStatusInfo(extraction.status)
  const isFailed = statusInfo.tone === 'red'
  const isReading = statusInfo.label === 'READING…'

  const parts = []
  if (typeof extraction.total_pages === 'number' && extraction.total_pages > 0) {
    parts.push(extraction.total_pages + ' ' + (extraction.total_pages === 1 ? 'page' : 'pages'))
  }
  if (extraction.has_ocr || (extraction.ocr_pages && extraction.ocr_pages > 0)) {
    parts.push('scanned')
  }
  if (typeof extraction.total_tables === 'number' && extraction.total_tables > 0) {
    parts.push(extraction.total_tables + ' ' + (extraction.total_tables === 1 ? 'table' : 'tables'))
  }

  const pagesText = parts.length > 0 ? parts.join(' · ') : (isReading ? 'Reading…' : '—')

  return {
    id: file.file_id,
    name: file.original_filename,
    classificationType: extraction.classification_type || 'other',
    pagesText,
    chip: statusInfo.label,
    tone: statusInfo.tone,
    isFailed,
    isReading,
    isReady: extraction.status === 'INDEXED',
    batchId: file.batch_id || null,
    canRetry: Boolean(extraction.retry_eligible ?? file.retry_eligible),
    error: extraction.error_message || file.error_message || 'Reading timed out or could not be completed.',
  }
}

/**
 * Filter stored files (INGESTED and not archives) and map them for Read Documents.
 */
export function toReadRows(files = []) {
  return files
    .filter((f) => f.status === 'INGESTED' && !f.is_archive)
    .map(toReadRow)
}

/**
 * Computes top summary tiles for Step 2:
 * files ready (X of Y), pages read, scanned pages, tables kept
 */
export function toReadTiles(files = []) {
  const storedFiles = files.filter((f) => f.status === 'INGESTED' && !f.is_archive)
  const total = storedFiles.length
  const readyCount = storedFiles.filter((f) => f.extraction?.status === 'INDEXED').length

  let pagesRead = 0
  let scannedPages = 0
  let tablesKept = 0

  storedFiles.forEach((f) => {
    const ext = f.extraction
    if (!ext) return
    if (typeof ext.total_pages === 'number') pagesRead += ext.total_pages
    if (typeof ext.ocr_pages === 'number') {
      scannedPages += ext.ocr_pages
    } else if (ext.has_ocr) {
      scannedPages += ext.total_pages || 1
    }
    if (typeof ext.total_tables === 'number') tablesKept += ext.total_tables
  })

  return [
    { label: 'files ready', value: readyCount + ' of ' + total },
    { label: 'pages read', value: String(pagesRead) },
    { label: 'scanned pages', value: String(scannedPages) },
    { label: 'tables kept', value: String(tablesKept) },
  ]
}
