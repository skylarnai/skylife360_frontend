/**
 * Filters and validates file IDs eligible for the Claim Intake Gap Check.
 *
 * Requirements:
 * 1. status === 'INGESTED'
 * 2. extraction.status === 'INDEXED'
 * 3. Not an archive (!is_archive)
 * 4. Max 20 files
 */
export function getIntakeEligibleFiles(files = []) {
  if (!Array.isArray(files)) return []

  return files.filter(
    (f) => f.status === 'INGESTED' && !f.is_archive && f.extraction?.status === 'INDEXED'
  )
}

/**
 * Returns the summary status for documents ready for gap check:
 * { eligibleCount, totalUploadedCount, isReady, fileIds }
 */
export function getIntakeFilesSummary(files = []) {
  if (!Array.isArray(files)) {
    return { eligibleCount: 0, totalCount: 0, isReady: false, fileIds: [] }
  }

  const nonArchives = files.filter((f) => !f.is_archive)
  const eligible = getIntakeEligibleFiles(files)
  const fileIds = eligible.map((f) => f.file_id).slice(0, 20)

  return {
    eligibleCount: eligible.length,
    totalCount: nonArchives.length,
    isReady: fileIds.length > 0,
    fileIds,
    hasTooMany: eligible.length > 20,
  }
}

