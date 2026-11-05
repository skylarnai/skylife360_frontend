import { Note } from '@/components/ui'

/** Shown when a screen is filled from mock data because a NEEDED endpoint is not live yet. */
export function DemoDataNote({ what, endpoint }) {
  return (
    <Note className="small">
      Showing demo {what}: <code>{endpoint}</code> is not on the server yet. See{' '}
      <code>docs/03 - Doctor and Staff/doctor_flow_apis.md</code>.
    </Note>
  )
}
