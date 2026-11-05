// "API for this screen" panels for the Doctor / Staff flow (dev-only ApiRail).
// Keep in step with docs/03 - Doctor and Staff/doctor_flow_apis.md: N1–N7 are the NEEDED ids there.
// Format: [method, path, tag, note]. NEEDED endpoints are served from *.mock.js until the backend ships them.

export const PATIENT_DOCUMENTS_APIS = [
  [
    'GET',
    '/api/v1/files?patient=&type=&status=',
    'NEEDED',
    'N1 · document list + tile counts (mock now)',
  ],
  [
    'POST',
    '/api/v1/rag/search',
    'READY',
    'Search inside documents · filters.user_id · 1 passage per file',
  ],
  ['GET', '/api/v1/files/{file_id}/text?page=', 'READY', 'Detail panel text, one page per call'],
  ['GET', '/api/v1/ingestion/files/{file_id}', 'READY', 'Status, size, timestamps of one file'],
  ['POST', '/api/v1/tasks', 'NEEDED', 'N7 · "Ask records to re-scan" (mock now)'],
  ['GET', '/api/v1/patients?mine=true', 'NEEDED', 'N2 · patient filter (mock now)'],
]

export const ASK_PATIENT_APIS = [
  [
    'POST',
    '/api/v1/rag/ask',
    'READY',
    'Answer with sources · filters.user_id = patient · stream=false',
  ],
  ['POST', '/api/v1/evaluation/evaluate', 'READY', 'Answer check: grounded, relevance, safety'],
  ['POST', '/api/v1/rag/search', 'READY', 'Ranked passages only (fallback view)'],
  ['GET', '/api/v1/patients?mine=true', 'NEEDED', 'N2 · patient picker (mock now)'],
]

export const PATIENT_SUMMARY_APIS = [
  ['GET', '/api/v1/patients?mine=true', 'NEEDED', 'N2 · patient picker (mock now)'],
  [
    'GET',
    '/api/v1/patients/{user_id}',
    'NEEDED',
    'N3 · header: sex, age, diagnosis, doctor, dates, claim stage',
  ],
  [
    'GET',
    '/api/v1/patients/{user_id}/timeline',
    'NEEDED',
    'N4 · dated events, each with its source page',
  ],
  ['GET', '/api/v1/files?patient=', 'NEEDED', 'N1 · documents rail (mock now)'],
]

export const MY_TODOS_APIS = [
  ['GET', '/api/v1/tasks?assignee=me', 'NEEDED', 'N5 · to-do list + tab badge count (mock now)'],
  [
    'POST',
    '/api/v1/tasks/{task_id}/resolve',
    'NEEDED',
    'N6 · mark done · { note?, reply? } (mock now)',
  ],
  [
    'POST',
    '/api/v1/rag/ask',
    'READY',
    'Draft an insurer reply from the documents (server-side, on task create)',
  ],
  [
    'GET',
    '/api/v1/claims/gap-reports/{gap_report_id}',
    'READY',
    'Gap report sent back to this user (not wired yet)',
  ],
]
