import { Logo } from '@/components/common/Logo'
import { env } from '@/config/env'

function Icon({ children }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

const FEATURES = [
  {
    tag: 'ADMIN',
    title: 'Claims desk',
    text: 'Upload, read, check gaps against payer rules, run integrity checks and approve, all in one place.',
    icon: (
      <>
        <path d="M9 12l2 2 4-4" />
        <path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6z" />
      </>
    ),
  },
  {
    tag: 'DOCTOR / STAFF',
    title: 'Patient records',
    text: 'Find patient documents, read the summary and complete the to-dos the claims team sends you.',
    icon: (
      <>
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
        <path d="M14 3v5h5" />
        <path d="M9 13h6M9 17h4" />
      </>
    ),
  },
  {
    tag: 'EVIDENCE',
    title: 'Every finding has a source',
    text: 'Gaps and flags point to the document and page they came from, so reviewers can check in seconds.',
    icon: (
      <>
        <circle cx="11" cy="11" r="6" />
        <path d="M20 20l-4.2-4.2" />
        <path d="M9 11h4" />
      </>
    ),
  },
  {
    tag: 'CONTROL',
    title: 'Two people sign off',
    text: 'The person who prepares a claim can’t approve it, and every decision is kept in the audit trail.',
    icon: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
        <path d="M16 11l2 2 4-4" />
      </>
    ),
  },
]

export function AuthSidePanel() {
  return (
    <div className="lside">
      <Logo size={56} className="brand-lg" />
      <div className="lhero">
        <span className="lbl">Hospital claims workspace</span>
        <h1>{env.appName}</h1>
        <p className="lead">
          One secure workspace that turns scattered patient documents into clean, evidence-backed
          insurance claims.
        </p>
      </div>
      <ul className="lfeat">
        {FEATURES.map((f) => (
          <li key={f.tag} title={f.text}>
            <span className="ic">
              <Icon>{f.icon}</Icon>
            </span>
            <div>
              <b>{f.tag}</b>
              <strong>{f.title}</strong>
              <span>{f.text}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
