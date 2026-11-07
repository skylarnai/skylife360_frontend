import { useQuery } from '@tanstack/react-query'
import { gapInboxApi } from '../api/gapInboxApi'

export const gapInboxQueryKey = (status, page) => ['gap-inbox', status, page]

/** Gap reports sent back to the caller's patients. `status` defaults to the ones to act on. */
export function useGapInbox({ status = 'AVAILABLE', page = 1, pageSize = 20 } = {}) {
  const statuses =
    status === 'ALL' ? ['AVAILABLE', 'RESOLVED', 'GENERATING', 'REVOKED', 'FAILED'] : [status]
  return useQuery({
    queryKey: gapInboxQueryKey(status, page),
    queryFn: () => gapInboxApi.list({ status: statuses, page, pageSize }),
    placeholderData: (previous) => previous,
  })
}

/** Detail of one report (gap_summary per category, tasks[]), loaded when the card is opened. */
export function useGapReport(gapReportId, enabled = true) {
  return useQuery({
    queryKey: ['gap-report', gapReportId],
    queryFn: () => gapInboxApi.get(gapReportId),
    enabled: Boolean(gapReportId) && enabled,
  })
}
