# S08 — My to-dos

| Field | Value |
|---|---|
| Screen | S08 — My to-dos (what the claims desk needs from the hospital) |
| Role | Doctor (`VIEWER`, granted patients), Records staff (`MEMBER`, whole hospital) · acting needs `tasks:resolve` |
| Route | `/todos` (`?tab=reports` opens Sent-back claims) |
| Depends on | S00, S01, S05 ("Open documents"), S03.6 (Send back creates the to-dos) |
| Next screens that depend on this | S03.4 shows a gap as `FIXED`; the worklist shows `READY TO RECHECK` |
| Status | **Wired** to backend `dev@49913f8` (N5–N7). No mocks. |
| Design and test plan | [todo_actions_final_step.md](todo_actions_final_step.md) · steps: [end_to_end_claim_flow.md](../end_to_end_claim_flow.md) §8a |

## 1. Purpose

Close the send-back loop. When the claims desk sends a claim back, the backend creates one to-do per fixable gap (plus a re-scan per unreadable file). Doctors and records staff work through them here; when the last one is done the gap report is `RESOLVED` and the admin re-runs Check gaps.

## 2. Layout

```
┌ main ─────────────────────────────────────────────────────────────┐ ┌ rail ───────────┐
│ My to-dos                        What the claims desk needs …     │ │ API (dev)       │
│ [To do] [Sent-back claims]                                        │ │ Activity        │
│ [Open ▾] [Mine (me and my team) ▾]   2 open · 3 shown             │ └─────────────────┘
│ ┌ Upload the pre-authorization diagnostic reports  [DOCUMENT NEEDED] ┐
│ │ Echo, Troponin I/T are not documented.                           │
│ │ Farah Siddiqui · SYN-AS-203 · claim SUV-261112-03                │
│ │ For Records staff · from Admin User, 07 Nov 2026                 │
│ │ [Uploaded] [Open documents →]                                    │
│ │   ↳ open: [Choose the new file ▾] [Upload a file]  [note]  [Uploaded] [Cancel] │
│ └──────────────────────────────────────────────────────────────────┘
```

Sent-back claims tab: one card per gap report with "2 of 3 done" and a progress bar, chip `TO FIX` / `RESOLVED` / `WITHDRAWN` / `FAILED`, **Show details** (breakdown + each to-do and who did it), **Open documents →**, Download (disabled).

## 3. To-do types

| `type` | Chip (tone) | Button | Resolve body | Who |
|---|---|---|---|---|
| `DOCUMENT` | DOCUMENT NEEDED (amb) | Uploaded | `file_id` **required**, `note?` | Records staff |
| `RESCAN` | RE-SCAN (grey) | Mark done | `file_id?`, `note?` | Records staff |
| `CONFIRM` | PLEASE CONFIRM (teal) | Confirm | `note?` | Doctors |
| `PAYER_QUERY` | INSURER QUESTION (teal) | Send reply | `reply` **required**, `note?` | Doctors |
| `SIGNATURE` | SIGNATURE NEEDED (amb) | Mark as signed | `note?` | Doctors |

The file picker lists the patient's files uploaded **after** the to-do was created (the backend rejects older ones with `INVALID_FILE`). Users with `files:upload` can **Upload a file** right on the card; it's linked to the to-do's claim and selected automatically.

## 4. States and errors

| Case | UI |
|---|---|
| Loading / error | "Loading to-dos…" / `ErrorBox` with retry |
| Empty (Open) | Note explaining what will appear here |
| Done | Card at 65% opacity, `DONE` chip, "Done by … at …", reply and note |
| `400 MISSING_FILE` / `MISSING_REPLY` / `INVALID_FILE` | Plain message under the form (button is also disabled until required fields are filled) |
| `409 TASK_ALREADY_RESOLVED` | "Someone already finished this to-do"; the list refreshes |
| `404` | "This to-do is no longer available to you" |
| No `tasks:resolve` | Action buttons hidden |

Filters: status Open / Done / All; **Mine** (`assignee=me`: me + my role's pool) or **Everyone's** (`assignee=all`: everything in my scope, e.g. a doctor following staff progress). The tab badge is `open_count` for `assignee=me`.

## 5. APIs

| Method | Path | Used for |
|---|---|---|
| GET | `/api/v1/tasks?assignee=&status=&page=&page_size=` | N5 list + badge (`open_count`) |
| POST | `/api/v1/tasks/{task_id}/resolve` | N6 actions |
| POST | `/api/v1/ingestion/upload` | Upload a file on DOCUMENT / RE-SCAN cards |
| GET | `/api/v1/files?patient=&uploaded_after=<task.created_at>` | File picker (only files the resolve accepts) |
| GET | `/api/v1/claims/gap-reports?status=` | Sent-back claims (`task_count`, `open_task_count`) |
| GET | `/api/v1/claims/gap-reports/{id}` | Details: `gap_summary`, `tasks[]` |
| POST | `/api/v1/tasks` | N7, used by S05 **Request re-scan** |

After any resolve, the `tasks`, `gap-inbox`, `gap-report` and `gaps-run` queries are refreshed.

## 6. Files

```
src/features/tasks/
  pages/MyTodosPage.jsx         two tabs, filters, paging
  components/TaskCard.jsx       chip, action form, file picker + upload
  components/GapReportCard.jsx  progress, RESOLVED, task list
  hooks/useTasks.js             useTasks · useOpenTaskCount · useResolveTask · useCreateTask
  hooks/useGapInbox.js          useGapInbox · useGapReport
  api/tasksApi.js               N5 / N6 / N7
  api/gapInboxApi.js            gap-report inbox
  constants.js                  TASK_TYPES, resolve error messages
```

## 7. Acceptance criteria

1. Send back on a claim with soft gaps → the records staff user sees DOCUMENT NEEDED cards; the badge counts them.
2. Upload a file on the card → it's selected → **Uploaded** → card shows DONE; report shows "1 of 2 done".
3. Last to-do done → report `RESOLVED`, worklist `READY TO RECHECK`, Check gaps shows `FIXED`.
4. A second user resolving the same to-do gets the 409 message and a refreshed list.
5. A hard-rejected claim shows a report with no to-dos and "The hospital can't fix this one".

## 7a. Not covered

- Report download (backend: links need a user-bound API key).
- Creating insurer questions and signature requests from the claim desk (API only).
- Suggested insurer reply (`suggested_reply` is always `null` until the models).
