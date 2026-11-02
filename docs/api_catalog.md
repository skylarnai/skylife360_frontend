# API catalog — every endpoint the screens use

| Field | Value |
|---|---|
| Base | `/api/v1` on the FastAPI backend (`D:\projects\sky_life_360_dev`) |
| Checked against | backend `dev` branch, routers under `app/features/*` (2 Nov 2026) |
| Tags | **READY** = exists today · **NEEDED** = must be added before the screen can be wired |

> **Auth today vs. planned.** Today every backend route requires an `X-API-Key` header; there is no staff login. The browser must never hold that key: in dev the Vite proxy adds it on the server side (see S00 §6). The planned auth module replaces it for people with an `HttpOnly` session cookie + `X-CSRF-Token`; API keys stay for machines.

## READY — exists in the backend

| Method | Path | Screens | Notes |
|---|---|---|---|
| POST | `/ingestion/upload` | S03.1, S05 | multipart `files[]`, `user_id`, `classification_type`; `Idempotency-Key`; `201` |
| GET | `/ingestion/batches/{batch_id}` | S03, S03.1, S03.2 | per-file results, `counts`, `is_complete` |
| GET | `/ingestion/files/{file_id}` | S03.2, S05 | one file's status and timestamps |
| POST | `/ingestion/batches/{batch_id}/retry` | S03.2 | `{ file_ids? }` |
| POST | `/rag/search` | S03.3, S05, S06 | `{ query, filters: { user_id, file_ids, classification_types }, top_k, max_chunks_per_file }` |
| POST | `/rag/ask` | S03.3, S06, S08 | as search + `stream` (SSE when true); returns `answer`, `answered`, `citations[]`, `sources[]`, `generation_id` |
| POST | `/evaluation/evaluate` | S03.3, S06 | answer check by `generation_id` (evaluator is a placeholder today) |
| POST | `/claims/intake/extract` | S03.4, S07 | facts with citations, nothing created |
| POST | `/claims/intake` | S03.4 | runs facts → gaps → packet → queues integrity → review; returns `intake_id, gap_run_id, packet_id, integrity_run_id, pipeline` |
| GET | `/claims/intake/{intake_id}` | S02, S03, S03.6 | live `pipeline` (packet, integrity run, review task, submission) |
| GET | `/claims/gaps/runs/{run_id}` | S03.4, S08 | findings with source pages |
| GET | `/claims/gaps/runs/{run_id}/report` | S03.4 | gap report link |
| GET | `/claims/packets/assemblies/{assembly_id}` | S03.4 | packet status, format, attachments |
| GET | `/claims/packets/assemblies/{assembly_id}/download` | S03.4 | packet link |
| GET | `/claims/registry/diseases` | S03.4 | ICD-10 / PM-JAY lookup |
| POST | `/integrity/check` | S03.5 | `{ packet_id }` → `202 { run_id }` |
| GET | `/integrity/runs/{run_id}` | S03.5 | `status`, `overall_flag`, `checks[]` |
| GET | `/integrity/checks/{packet_id}` | S03.5 | latest run of a packet |
| GET | `/integrity/files/{file_id}` | S03.5 | forensics of one upload |
| GET | `/reviews/pending` | S02 | `?limit&offset&stage=INTEGRITY_REVIEW|CODER_REVIEW` → `{ total, items }` |
| POST | `/reviews` | S03.6 | `{ packet_id }` opens a task |
| GET | `/reviews/{task_id}` | S03.6 | `version`, `blockers`, `flags`, `integrity_checks`, `rationale_min_chars` |
| POST | `/reviews/{task_id}/integrity-clearance` | S03.6 | Compliance split |
| POST | `/reviews/{task_id}/adjudicate` | S03.6 | `{ version, decision, rationale, false_positive_checks, gap_report_recipients }`; stale → `409` |
| POST | `/claims/submissions` | S03.6 | `{ packet_id }` → `202 { submission_id, status }` |
| GET | `/claims/submissions` | S02 | list |
| GET | `/claims/submissions/{submission_id}` | S03.6 | `QUEUED → DISPATCHING → SUBMITTED` |
| POST | `/claims/submissions/{submission_id}/requeue` | S03.6 | retry dispatch |
| POST | `/claims/submissions/{submission_id}/document-link` | S03.6 | submitted document link |
| POST | `/claims/rejections` | S03.6 | payer rejections coming back |
| GET | `/claims/gap-reports/{gap_report_id}` | S03.6, S08 | report sent to the hospital |
| POST | `/claims/gap-reports/{gap_report_id}/links` | S08 | short-lived link |
| GET | `/statuses` | S00 | status code → label maps |

Not used by any screen yet (admin tools for later): `/rules/*`, `/charges/*`, `/claims/registry/ingest` and datasets, `/outcomes/*`, `/models/*`, `/evaluations/ragas`.

## NEEDED — must be added to the backend

| Method | Path | Screens | Backend module |
|---|---|---|---|
| POST | `/auth/login` | S01 | auth (new) |
| POST | `/auth/mfa/verify` | S01 | auth |
| GET | `/auth/me` | S00, S01 | auth |
| POST | `/auth/logout` | S00 | auth |
| POST | `/auth/password/forgot` | S01 | auth |
| POST | `/auth/password/reset` | S01 | auth |
| GET · POST | `/users` | S04 | auth |
| PATCH | `/users/{id}` | S04 | auth |
| GET · POST · DELETE | `/users/{id}/patients` | S04 | auth (`staff_patient_access`) |
| GET · POST | `/claims` | S02 | claims record (new) |
| GET | `/claims/{claim_id}` | S03 | claims record |
| POST | `/claims/{claim_id}/documents` | S03.1 | claims record (link batches) |
| GET | `/files?patient=&type=&status=` | S05, S07 | ingestion (list) |
| GET | `/files/{file_id}/text` | S05 | ingestion / extraction (page text) |
| GET | `/patients` | S06 | patients (new) |
| GET | `/patients/{user_id}` | S07 | patients |
| GET | `/patients/{user_id}/timeline` | S07 | patients (from extracted facts) |
| GET | `/tasks?assignee=me` | S08 | tasks (new) |
| POST | `/tasks` | S05, S08 | tasks |
| POST | `/tasks/{task_id}/resolve` | S08 | tasks |

## Cross-cutting backend work the UI relies on

- Role checks on the routes (`require_permission`), doctor care-team scope on files, search and ask.
- CORS for the frontend origin with credentials.
- `actor_id` (the signed-in person) in review and submission audit logs.
- Optional: server-sent events for upload, extraction, integrity and submission status, to replace polling.
