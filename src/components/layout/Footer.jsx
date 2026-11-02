import { MESSAGES } from '@/constants/messages'

export function Footer() {
  return (
    <footer className="foot">
      <span>{MESSAGES.FOOTER_DISCLAIMER}</span>
      <span>{MESSAGES.FOOTER_COPYRIGHT}</span>
    </footer>
  )
}
