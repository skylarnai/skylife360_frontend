# S08 — My to-dos

| Field | Value |
|---|---|
| Screen | S08 — My to-dos (requests from the claims team and insurers) |
| Role | Doctor (`VIEWER`), Records staff (`MEMBER`) · resolving needs `tasks:resolve` |
| Route | `/todos` |
| Prototype reference | `viewTasks()`, `TASKS` |
| Depends on | S00, S01, S05 ("Open document") |
| Next screens that depend on this | S03.4 shows a gap as `FIXED` when its to-do is done |
| Status | **Built** against an in-memory mock (resolving works in the session) |
| API readiness | **NEEDED**: N5 list, N6 resolve, N7 create ([doctor_flow_apis.md](doctor_flow_apis.md)) |

## 1. Purpose

Give doctors and records staff one list of what the claims team and insurers need from them: sign a record, answer an insurer question, confirm a diagnosis, re-scan a page. Each to-do shows the document to look at and has a one-click way to mark it done.

## 2. Users and permissions

`tasks:resolve` to act. Each user sees to-dos assigned to them or to their role pool (re-scans go to records staff). The tab badge shows the open count (`useOpenTaskCount`, same cache as the list).

## 3. Layout

```
┌ main ──────────────────────────────────────────────────────────┐ ┌ rail ─────────────────┐
│ My to-dos                   Requests from the claims team and insurers │ API (dev)       │
│ [ Showing demo to-dos … ]                  ← only while mock    │ │ Activity · audit     │
│ (4 to do) (1 done)                                              │ └──────────────────────┘
│ ┌ [SIGNATURE NEEDED] Sign the anaesthesia record   SYN-P-1042 · SUV-261028-01 ┐
│ │ The anaesthetist signature is blank. …                       │
│ │ See: anaesthesia_record.jpg · page 1                          │
│ │ [Mark as signed] [Open document]                              │
│ └──────────────────────────────────────────────────────────────┘
│ ┌ [INSURER QUESTION] Explain the 2-night stay  SYN-P-1042 · TPA SYN-3 ┐
│ │ Suggested reply (edit before sending) [textarea] [discharge_summary.pdf, page 1] │
│ │ [Send reply] [Open document]                                  │
│ └──────────────────────────────────────────────────────────────┘
```

Done to-dos fade to 65% opacity and show a `DONE` chip and "Done by Dr. S. Menon at 11:42".

## 4. Content and states

| Type | Chip (tone) | Action |
|---|---|---|
| `SIGNATURE` | SIGNATURE NEEDED (amb) | Mark as signed |
| `PAYER_QUERY` | INSURER QUESTION (teal) | Send reply (the reply is editable and can't be empty) |
| `CONFIRM` | PLEASE CONFIRM (teal) | Confirm |
| `RESCAN` | RE-SCAN NEEDED (red) | Mark as re-scanned |

Order: open first, then by due date. Empty: "Nothing to do. New requests from the claims team will appear here." Map: `src/features/tasks/constants.js`.

## 5. Interactions

- **Action button** → resolve, sending the reply text for `PAYER_QUERY`. Logs "completed: …" in the activity rail, and refreshes `['tasks']` (list + badge) and `['gaps']`.
- **Open document** → `/documents?file=<file_id>` (S05).
- Without `tasks:resolve`, the action button is hidden and the reply is read-only.

## 6. APIs

Dev panel list: `MY_TODOS_APIS` in `src/constants/doctorFlowApis.js`.

| Method | Path | Tag | Used for |
|---|---|---|---|
| GET | `/api/v1/tasks?assignee=me&status=` | **NEEDED · N5** | List + badge |
| POST | `/api/v1/tasks/{task_id}/resolve` | **NEEDED · N6** | `{ note?, reply? }` → task (`DONE`, `resolved_by`, `resolved_at`) |
| POST | `/api/v1/tasks` | **NEEDED · N7** | Created by S05 re-scan and by the claims desk / gap engine |
| POST | `/api/v1/rag/ask` | READY | Backend drafts `suggested_reply` when a `PAYER_QUERY` is created |
| GET | `/api/v1/claims/gap-reports/{gap_report_id}` | READY | Gap report sent back to this user (not wired yet) |

## 7. Data mapping

| API | UI |
|---|---|
| `type` | Chip + button (section 4) |
| `user_id` + (`payer` or `claim_id`) | Reference line (mono) |
| `source.original_filename`, `page_number` | "See: … · page N" |
| `suggested_reply.text` / `.citation` | Textarea / citation chip |
| `status: DONE`, `resolved_by`, `resolved_at` | Faded card, `DONE` chip, "Done by … at HH:mm" |

## 8. Components

S00: `Chip`, `Pill`, `Button`, `TextArea`, `CardPad`, `ApiRail`, `ActivityRail`. Feature: `TaskCard`. The tab badge is wired in `components/layout/RoleTabs.jsx`.

## 9. Files

```
src/features/tasks/
  pages/MyTodosPage.jsx
  components/TaskCard.jsx
  hooks/useTasks.js          useTasks · useOpenTaskCount · useResolveTask · useCreateTask
  api/tasksApi.js            N5 / N6 / N7 with mock fallback
  api/tasksApi.mock.js       5 prototype to-dos, kept in memory
  constants.js               TASK_TYPES
```

## 10. Acceptance criteria

1. The mock shows the five prototype to-dos with matching chips, buttons and wording. ✅
2. Resolving one updates the counts, the tab badge and the card without a reload. ✅
3. The insurer reply can be edited before sending and keeps its citation. ✅
4. "Open document" lands on S05 with the file selected. ✅

## 11. Backend gaps and open questions

- **N5–N7:** a `tasks` module (table + router) and a `gap_finding_id` link, so resolving a to-do marks the gap `FIXED`.
- Who sends the insurer reply to the TPA? Proposed: the claims admin from the desk; the doctor's reply is stored on the task.

## 12. Build prompt for Claude

> When the `/api/v1/tasks` endpoints (N5–N7 in `docs/03 - Doctor and Staff/doctor_flow_apis.md`) ship, remove the mock fallbacks in `tasksApi.js` and delete `tasksApi.mock.js`. Check the badge count, resolve flow and S05 re-scan against the real API. Run lint and build.
