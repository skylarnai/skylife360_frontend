import { Logo } from '@/components/common/Logo'

export function AuthSidePanel() {
  return (
    <div className="lside">
      <Logo />
      <div className="lhero">
        <span className="lbl">Hyderabad · tenant SYN-HOSP-01</span>
        <h1>Suvidha Hospital</h1>
        <p className="lead">
          One secure workspace that turns scattered patient documents into clean, evidence-backed
          insurance claims.
        </p>
      </div>
      <ul className="lfeat">
        <li>
          <span className="ic">
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
              <path d="M9 12l2 2 4-4" />
              <path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6z" />
            </svg>
          </span>
          <div>
            <b>ADMIN</b>
            <span>
              Claims desk: upload, extract, gap check, integrity, sign-off and submission.
            </span>
          </div>
        </li>
        <li>
          <span className="ic">
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
              <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
              <path d="M14 3v5h5" />
              <path d="M9 13h6M9 17h4" />
            </svg>
          </span>
          <div>
            <b>DOCTOR / STAFF</b>
            <span>
              Find patient documents, ask questions about a patient, and complete the to-dos the
              claims team sends you.
            </span>
          </div>
        </li>
      </ul>
      <div className="lnote">
        Demo workspace. Suvidha Hospital and all patient data are fictional.
      </div>
    </div>
  )
}
