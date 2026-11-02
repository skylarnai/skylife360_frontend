# S08 — My to-dos

| Field | Value |
|---|---|
| Screen | S08 — My to-dos (requests from the claims team and insurers) |
| Role | Doctor, Records staff (`tasks:resolve`); Admin can view |
| Route | `/todos` |
| Prototype reference | `viewTasks()`, `TASKS` |
| Depends on | S00, S01 |
| Next screens that depend on this | S03.4 shows a gap as `FIXED` when its to-do is done |
| Status | Planned |
| API readiness | Partial: gap reports are READY; the to-do list and resolve are **NEEDED** |

## 1. Purpose

Give doctors and records staff one list of what the claims team and insurers need from them (sign a record, answer an insurer question, confirm a diagnosis, re-scan a page), with the document to look at and a one-click way to mark it done.

## 2. Users and permissions

`tasks:resolve`. Each user sees only to-dos assigned to them. The tab badge shows the open count.

## 3. Layout

```
┌ main ──────────────────────────────────────────────────────────┐ ┌ rail ─────────────────┐
│ My to-dos                   Requests from the claims team and insurers │ API (dev)       │
│ (4 to do) (1 done)                                              │ │ Activity · audit     │
│ ┌──────────────────────────────────────────────────────────────┐ │ └──────────────────────┘
│ │ [SIGNATURE NEEDED] Sign the anaesthesia record   SYN-P-1042 · SUV-261028-01 │
│ │ The anaesthetist signature is blank. The insurer returns     │ │
│ │ surgical claims without it.                                  │ │
│ │ See: anaesthesia_record.jpg · page 1 (teal)                   │ │
│ │ [Mark as signed] [Open document]                             │ │
│ └──────────────────────────────────────────────────────────────┘ │
│ ┌ [INSURER QUESTION] Explain the 2-night stay  SYN-P-1042 · TPA SYN-3 ┐ │
│ │ …suggested reply (snippet with citation chip)…               │ │
│ │ [Send reply] [Open document]                                 │ │
│ └──────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

Done to-dos fade to 65% opacity, show a `DONE` chip and "Done by Dr. S. Menon at 11:42".

## 4. Content and states

| To-do type | Chip | Action button |
|---|---|---|
| `SIGNATURE` | SIGNATURE NEEDED (amb) | Mark as signed |
| `PAYER_QUERY` | INSURER QUESTION (teal) | Send reply (editable suggested reply) |
| `CONFIRM` | PLEASE CONFIRM (teal) | Confirm |
| `RESCAN` | RE-SCAN NEEDED (red) | Mark as re-scanned (records staff can upload the new file inline) |

Each card: chip, title, reference (patient · claim or payer, mono), description, "See: file · page", action buttons. Sort: open first, then due date. Empty: "Nothing to do. New requests from the claims team will appear here."

## 5. Interactions

- **Action button** → resolve the to-do (with an optional note; the insurer reply text for `PAYER_QUERY`). Activity: "completed: Sign the anaesthesia record". Invalidate the tab count and S03.4's gap list.
- **Open document** → S05 with that file and page.
- **Suggested reply** for insurer questions is drafted with `rag/ask` on the patient's documents and shown with its citation; the user can edit it before sending.

## 6. APIs

| Method | Path | Tag | Used for |
|---|---|---|---|
| GET | `/api/v1/tasks?assignee=me&status=` | **NEEDED** | `[{ task_id, type, title, description, user_id, claim_id, payer, source: { file_id, original_filename, page_number }, status, due_at, resolved_by, resolved_at }]` |
| POST | `/api/v1/tasks/{task_id}/resolve` | **NEEDED** | `{ note?, reply? }` → task |
| POST | `/api/v1/tasks` | **NEEDED** | Created by S05 "Ask records to re-scan" and by the gap engine |
| GET | `/api/v1/claims/gap-reports/{gap_report_id}` | READY | The gap report sent back to this user after a Send back (S03.6) |
| POST | `/api/v1/claims/gap-reports/{gap_report_id}/links` | READY | Short-lived link to open the report |
| GET | `/api/v1/claims/gaps/runs/{run_id}` | READY | Gap findings with source pages |
| POST | `/api/v1/rag/ask` | READY | Draft an insurer reply from the documents |

Until `/tasks` exists: mock the five prototype to-dos; show real gap reports (READY) as extra cards when the user has any.

## 7. Data mapping

| API | UI |
|---|---|
| `type` | Chip + button (section 4 table) |
| `user_id` + `claim_id` or `payer` | Reference line (mono) |
| `source` | "See: anaesthesia_record.jpg · page 1" |
| `status` `DONE`, `resolved_by`, `resolved_at` | Faded card, `DONE` chip, "Done by … at HH:mm" |

## 8. Components

S00: `Chip`, `Pill`, `Button`, `TwoColumn`, `ActivityRail`, `ApiRail`. Reuse `CitationText` (S03.3). New in `features/tasks/components/`: `TaskCard`, `SuggestedReply`, `TaskCounts`. Hook `useOpenTaskCount()` for the tab badge (in S00's `RoleTabs`).

## 9. Files to create

```
src/features/tasks/
  pages/MyTodosPage.jsx
  api/tasksApi.js  tasksApi.mock.js
  hooks/useTasks.js  useResolveTask.js  useOpenTaskCount.js  useSuggestedReply.js
  components/TaskCard.jsx  SuggestedReply.jsx  TaskCounts.jsx
  constants.js   TASK_TYPES (chip, tone, action label)
```

## 10. Acceptance criteria

1. The mock shows the five prototype to-dos with matching chips, buttons and wording.
2. Resolving one updates the counts, the tab badge and the card (faded, `DONE`, who and when) without a page reload.
3. The insurer-question reply can be edited before sending and keeps its citation.
4. "Open document" lands on S05 with the file selected.

## 11. Backend gaps and open questions

- **NEEDED:** a `tasks` module (table + `GET /tasks`, `POST /tasks`, `POST /tasks/{id}/resolve`) and a link from gap findings to tasks, so a resolved to-do marks the gap as fixed.
- Who sends insurer replies to the TPA, and how? (Probably the claims admin from the desk; the doctor only drafts.)

## 12. Build prompt for Claude

> Build S08 from `docs/03 - Doctor and Staff/my_todos_S08.md` against `tasksApi.mock.js` (the five prototype to-dos), with the same function signatures the real `/api/v1/tasks` endpoints will have. Draft the insurer reply with the real `POST /api/v1/rag/ask`. Wire the tab badge count. Meet section 10, then run lint and build.
