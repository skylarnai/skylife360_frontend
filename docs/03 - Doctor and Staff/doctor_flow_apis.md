# Doctor / Staff flow — APIs

| Field | Value |
|---|---|
| Screens | S05 Patient documents · S07 Patient summary · S08 My to-dos |
| Out of scope this phase | S06 Ask about a patient, the S07 timeline (N4), search inside the text, the suggested insurer reply. All of these need the AI models. |
| Roles | `VIEWER` (doctor, only patients granted to them) · `MEMBER` (records staff, whole hospital) · `ADMIN` (whole hospital) |
| Backend checked | `D:\projects\sky_life_360_dev` @ `203f135` (7 Nov 2026). N1–N3 shipped in `73c22bb`, to-dos N5–N7 in `49913f8`. |
| Frontend status | **Wired.** Every screen calls the real API. The file and patient mocks and the "Showing demo …" notes have been removed. |
| Dev API panels | `src/constants/doctorFlowApis.js` |
| Full walkthrough | [end_to_end_claim_flow.md](../end_to_end_claim_flow.md) |

---

## 1. Flow and the API behind each screen

```
Login (S01) ──► /auth/me  role = VIEWER | MEMBER  ──► lands on /documents
                                                        │
      ┌─────────────────────────────────────────────────┼───────────────────────────────────┐
      ▼                                                 ▼                                   ▼
S05 Patient documents                          S07 Patient summary                   S08 My to-dos
  N1 GET /files            (list, tiles)          N2 GET /patients      (picker)        To do:  N5 GET /tasks · N6 POST /tasks/{id}/resolve
  N2 GET /patients         (filter)               N3 GET /patients/{id} (header)                POST /ingestion/upload (new file)
  GET /files/{id}/text     (detail text)          N1 GET /files?patient= (rail)         Sent-back claims: GET /claims/gap-reports[/{id}]
  N7 POST /tasks           (Request re-scan)      "Open document" ──► S05               POST …/links (download: blocked)
```

## 2. Endpoints

| Method | Path | Screen | Frontend call | Notes |
|---|---|---|---|---|
| GET | `/api/v1/auth/me` | all | `authApi.me` | `role`, `permissions[]`. The UI keeps the backend role (`backendRole`) to tell a doctor (`VIEWER`, scoped) from staff (`MEMBER`, whole hospital). |
| GET | `/api/v1/files?patient=&type=&status=&q=&uploaded_after=&limit=&offset=` | S05, S07 rail, S08 file picker | `filesApi.listFiles` | S05 pages 25 at a time and sends the search box as `q` (file name, patient ID or name, type, procedure). The to-do file picker sends `uploaded_after=<task.created_at>`. `counts` covers the whole scope and ignores the filters (tiles). `status`: `INDEXED`, `EXTRACTION_FAILED`, `DUPLICATE`, `PROCESSING`. `uploaded_by` is `null` for older files. |
| GET | `/api/v1/patients?q=&limit=&offset=` | S05, S07, Users | `patientsApi.listPatients` | **`mine=true` is not sent:** the backend always scopes doctors, and `mine=true` would also narrow staff and admins to their own grants. Items: `user_id, name, sex, age, procedure_name, diagnosis{code,name}, treating_doctor, claim_id, claim_stage, admission_date, discharge_date`. Never amounts. |
| GET | `/api/v1/patients/{user_id}` | S07 | `patientsApi.getPatient` | `403 UNAUTHORIZED_USER` outside the doctor's scope (also for unknown IDs). `404 NOT_FOUND` if unknown for staff and admins. Both show as plain notes. |
| GET | `/api/v1/files/{file_id}/text?page=` | S05 | `filesApi.getFileText` | One page per call; the UI loads up to 20 pages |
| GET | `/api/v1/files/{file_id}/download` | S05 | `ingestionApi.getFileDownload` | Pre-signed URL, valid 5 min |
| GET | `/api/v1/tasks?assignee=me\|all&status=OPEN\|DONE\|ALL&page=&page_size=` | S08 To do, tab badge | `tasksApi.list` (N5) | `me` = assigned to me or my role's pool, `all` = everything in scope. Badge = `open_count` (`assignee=me`). Doctor: granted patients. |
| POST | `/api/v1/tasks/{task_id}/resolve` | S08 | `tasksApi.resolve` (N6) | `{ note?, reply?, file_id? }`. DOCUMENT needs `file_id` (this patient's, uploaded after the task); PAYER_QUERY needs `reply`. `400 MISSING_FILE / MISSING_REPLY / INVALID_FILE`, `409 TASK_ALREADY_RESOLVED` (the list refreshes). Marks the gap finding `FIXED`; the last one makes the report `RESOLVED`. |
| POST | `/api/v1/tasks` | S05 | `tasksApi.create` (N7) | **Request re-scan**: `RESCAN` for the records staff pool. `200` with the open one if it already exists. |
| POST | `/api/v1/ingestion/upload` | S08 | `ingestionApi.upload` | **Upload a file** on a DOCUMENT / RE-SCAN card, linked to the task's claim (`files:upload`) |
| GET | `/api/v1/claims/gap-reports?status=AVAILABLE\|RESOLVED&page=&page_size=` | S08 Sent-back claims | `gapInboxApi.list` | Doctor: granted patients. Staff and admins: the whole hospital. `task_count`, `open_task_count` → "2 of 3 done". |
| GET | `/api/v1/claims/gap-reports/{gap_report_id}` | S08 | `gapInboxApi.get` | `gap_summary` per category and `tasks[]`; 404 outside scope |
| POST | `/api/v1/claims/gap-reports/{gap_report_id}/links` | S08 | — | **Blocked:** needs a user-bound API key (`403 GAP_REPORT_USER_KEY_REQUIRED`). Download stays disabled. |

## 3. Scope rule (backend `owner_scope`)

| Caller | Files, patients, gap reports, tasks |
|---|---|
| `VIEWER` (doctor) | Only patients granted to them (`UserAccessGrant`). Grant them in **Users & access**, or with `python -m app.manage grant-user-access`. |
| `MEMBER`, `ADMIN`, `SUPER_ADMIN` | The whole hospital |

A doctor with no grants sees empty lists. S05 and S07 then say so and tell the doctor to ask an admin.

## 4. Later (needs the models)

| Feature | Endpoint | Frontend today |
|---|---|---|
| Search inside documents | `POST /rag/search` | Only with `VITE_ENABLE_ASK=true`; otherwise search matches file name, patient, type and procedure |
| Ask about a patient (S06) | `POST /rag/ask`, `POST /evaluation/evaluate` | Tab hidden (`VITE_ENABLE_ASK=false`) |
| Dated timeline (S07) | N4 `GET /patients/{id}/timeline` | Section removed |
| Suggested insurer reply on `PAYER_QUERY`, signature detection | `suggested_reply` is always `null` | Reply typed by the doctor |

## 5. Backend follow-ups still open

- Gap report download for signed-in users (`links` endpoint).
- Nothing re-runs Check gaps automatically on `READY_TO_RECHECK`.
- `assigned_user_ids` on `/auth/me` and `GET /files/{id}/text?all=true` are optional and not built.

---

Screen docs: [S05](patient_documents_S05.md) · [S07](patient_summary_S07.md) · [S08](my_todos_S08.md) · Folder overview: [README.md](README.md)
