import { useState } from 'react'
import { ingestionApi } from '../api/ingestionApi'

/**
 * Open a stored file in a new tab through GET /files/{id}/download (presigned URL, valid 5 min).
 * The tab is opened before the request so pop-up blockers allow it.
 */
export function useOpenFile() {
  const [openingId, setOpeningId] = useState(null)
  const [error, setError] = useState(null)

  const openFile = async (fileId) => {
    setError(null)
    setOpeningId(fileId)
    const tab = window.open('', '_blank')
    try {
      const { url } = await ingestionApi.getFileDownload(fileId)
      if (tab) {
        tab.opener = null
        tab.location.href = url
      } else {
        window.open(url, '_blank', 'noopener,noreferrer')
      }
    } catch (err) {
      tab?.close()
      setError(err)
    } finally {
      setOpeningId(null)
    }
  }

  return { openFile, openingId, error }
}
