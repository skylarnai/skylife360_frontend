# Final step: doctor and staff act on their to-dos (N5–N7)

| Field | Value |
|---|---|
| What this covers | The last step of the claim loop: a doctor or records staff member **acts** on what the claims team sent back (mark as signed, send a reply, confirm, re-scan), and the admin sees it as fixed |
| Screens | S08 My to-dos (actions) · S05 Patient documents (re-scan request) · S03.4 Check gaps (gap shows `FIXED`) · S03.6 Approve & submit (resubmit) |
| Roles | Doctor (`VIEWER`, granted patients) · Records staff (`MEMBER`, whole hospital) · Admin (`ADMIN`, creates and sees everything) |
| Permission | `tasks:resolve` (granted to `VIEWER`, `MEMBER`, `ADMIN`; enforced on resolve and create) |
| Backend checked | `D:\projects\sky_life_360_dev` @ `0c09a8f` (6 Nov 2026) |
| Status | **Built.** Backend `49913f8` (N5–N7, hand-off tasks, `RESOLVED`, `READY_TO_RECHECK`, `fix_status`). Frontend wired: S08 To do / Sent-back claims tabs, S05 Request re-scan, S03.4 `FIXED` chip, worklist badge. Sections 1 and 4 below describe the state before it was built. |
| Related | [my_todos_S08.md](my_todos_S08.md) (screen design) · [doctor_flow_apis.md](doctor_flow_apis.md) (N1–N7) · [end_to_end_claim_flow.md](../end_to_end_claim_flow.md) §8 |

---

## 1. Where the flow stops today

```
Admin: Approve & submit (S03.6)
   └─ Send back to the hospital ──► gap report (AVAILABLE) ──► Doctor / staff: My to-dos (S08)
                                                                   ├─ Show details        ✓ works
                                                                   ├─ Open documents →    ✓ works
                                                                   ├─ Download report     ✗ disabled (backend: links need a user-bound key)
                                                                   └─ Mark as signed / Send reply / Confirm   ✗ NOT BUILT
                                                                              │
                                                    nothing after this point: │ the report stays AVAILABLE,
                                                    the gap is never FIXED,   │ the claim is never re-run
```

| Piece | Today |
|---|---|
| List of sent-back claims for the doctor | ✓ `GET /claims/gap-reports?status=AVAILABLE` (scoped: doctor = granted patients, staff/admin = all) |
| Breakdown per category | ✓ `GET /claims/gap-reports/{id}` → `gap_summary` |
| One to-do per thing to fix | ✗ no tasks table, no API |
| Doctor marks it done / replies / confirms | ✗ |
| Gap shows `FIXED` on the admin's Check gaps step | ✗ |
| Gap report closes when every to-do is done | ✗ (only a tenant-level API key can revoke a report) |
| Admin re-runs Check gaps and resubmits | ✗ not guided; nothing tells the admin the hospital has finished |

## 2. The finished loop (target)

```
 ADMIN (claim desk)                    BACKEND                                  DOCTOR / STAFF (My to-dos)
 ─────────────────                     ───────                                  ─────────────────────────
 S03.6 Send back ───────────────► gap report + one TASK per open gap ─────────► S08 card per task
   (reason)                            (N7, created by the hand-off)               [SIGNATURE NEEDED] Mark as signed
                                                                                    [INSURER QUESTION] Send reply
                                                                                    [PLEASE CONFIRM]   Confirm
                                                                                    [RE-SCAN]          Upload new scan → Mark done
                                                                                          │
                                       N6 resolve ◄───────────────────────────────────────┘
                                       task DONE (resolved_by, resolved_at, note/reply)
                                       linked gap finding → FIXED
                                       all tasks of the report DONE → report RESOLVED
                                                │
 Claims worklist: SENT BACK → READY TO RECHECK ◄┘
 S03.4 Check gaps: gap rows show FIXED (who, when, note)
 Re-run Check gaps on the new documents ──► new packet ──► S03.5 Integrity ──► S03.6 Approve ──► SUBMITTED
```

## 3. Task types and actions

| `type` | Created when | Assigned to | Chip (tone) | Action button | Body sent to N6 |
|---|---|---|---|---|---|
| `SIGNATURE` | A gap says a record is unsigned (e.g. anaesthesia record) | Treating doctor | SIGNATURE NEEDED (amber) | **Mark as signed** | `{ note? }` |
| `PAYER_QUERY` | The insurer asks a question about the claim | Treating doctor | INSURER QUESTION (teal) | **Send reply** (textarea, can't be empty) | `{ reply, note? }` |
| `CONFIRM` | A gap needs a clinical confirmation (diagnosis, procedure, dates) | Treating doctor | PLEASE CONFIRM (teal) | **Confirm** | `{ note? }` |
| `RESCAN` | A document couldn't be read, or a page is missing (S05 "Request re-scan", or a missing-document gap) | Records staff pool (`MEMBER`) | RE-SCAN (grey) | **Mark done** (after uploading the new file) | `{ note?, file_id? }` |
| `DOCUMENT` | A required document is missing (e.g. *"An angiogram report is required for PCI."*) | Records staff pool | DOCUMENT NEEDED (amber) | **Uploaded**, with the new file picked from the patient's files | `{ file_id, note? }` |

Mapping a gap finding to a task type (backend, at send-back time):

| Gap finding | Task type |
|---|---|
| `reason_code = REQUIREMENT_UNMET` and the rule asks for a document type (`claim.document_types`) | `DOCUMENT` |
| Registry *pre-auth diagnostics not documented* (e.g. Echo, Troponin I/T) | `DOCUMENT` |
| `action = query` (any other) | `CONFIRM` |
| Extraction failed / unreadable page on a file of the packet | `RESCAN` |
| Hard rejection (`gap_type = hard`, `action = reject`) | **No task.** Shown on the gap report as "can't be fixed by the hospital"; `resubmission_allowed = false`. |

`SIGNATURE` and `PAYER_QUERY` are not produced by the gap engine today. They're created by hand from the claim desk (N7) until a signature detector and an insurer inbox exist.

## 4. API (backend to build)

All routes under `/api/v1`, tenant from the session, CSRF on writes. Scope follows `owner_scope` (doctor = granted patients, staff/admin = tenant).

### N5 `GET /tasks`

Query: `assignee=me|pool|all` (default `me` = assigned to me + my role pool), `status=OPEN|DONE|ALL` (default `OPEN`), `patient=`, `claim_id=`, `gap_report_id=`, `page`, `page_size`.

```json
{
  "total": 3, "open_count": 2, "page": 1, "page_size": 20,
  "items": [{
    "task_id": "…", "type": "DOCUMENT", "status": "OPEN",
    "title": "Upload the angiogram report",
    "detail": "An angiogram report is required for PCI.",
    "user_id": "SYN-AS-203", "patient_name": "Farah Siddiqui", "claim_id": "SUV-261112-03",
    "gap_report_id": "…", "gap_finding_id": "…",
    "assignee": { "kind": "user|role", "auth_user_id": "…", "role": "MEMBER", "name": "Dr. S. Menon" },
    "document": { "file_id": "…", "filename": "discharge_summary.pdf", "page": 1 },
    "suggested_reply": null,
    "created_by": "Admin User", "created_at": "2026-11-06T10:12:00Z",
    "resolved_by": null, "resolved_at": null, "note": null, "reply": null
  }]
}
```

The S08 tab badge uses `open_count`.

### N6 `POST /tasks/{task_id}/resolve`

Needs `tasks:resolve`. Body `{ "note": "…", "reply": "…", "file_id": "…" }`; which fields are required depends on `type` (§3).

| Response | When |
|---|---|
| `200` task with `status: DONE`, `resolved_by`, `resolved_at` | Done. Side effects: linked `gap_finding` → `FIXED`; if every task of the gap report is `DONE` → report `RESOLVED`; audit event `task_resolved`. |
| `400 MISSING_REPLY` / `MISSING_FILE` | `PAYER_QUERY` without `reply`; `DOCUMENT` without `file_id` |
| `404` | Outside the caller's scope |
| `409 TASK_ALREADY_RESOLVED` | Someone else resolved it first (UI refreshes the card) |
| `403 INSUFFICIENT_PERMISSIONS` | No `tasks:resolve` |

`file_id` must belong to the same patient (`user_id`) and be newer than the task.

### N7 `POST /tasks`

Needs `tasks:resolve` (staff, S05 re-scan) or `claims:approve` (admin, claim desk). Body:

```json
{ "type": "RESCAN", "user_id": "SYN-AS-203", "claim_id": "SUV-261112-03",
  "title": "Re-scan page 2 of the discharge summary", "detail": "Page is blurred.",
  "file_id": "…", "page": 2, "assignee": { "kind": "role", "role": "MEMBER" } }
```

Also called internally by the review hand-off on **Send back**: one task per fixable gap finding of the packet (§3 mapping), all linked to the new gap report.

### Changes to existing endpoints

| Endpoint | Change |
|---|---|
| `GET /claims/gap-reports` items | Add `task_count`, `open_task_count`, `status` can be `RESOLVED` |
| `GET /claims/gap-reports/{id}` | Add `tasks[]` (id, type, status, resolved_by, resolved_at) |
| `GET /claims/intake/{id}` → findings | Each finding: `fix_status: OPEN|FIXED`, `fixed_by`, `fixed_at`, `fix_note` |
| Claims worklist `pipeline_stage` | New `READY_TO_RECHECK`: sent back and every task done |

### Data model (proposal)

`tasks`: `id, tenant_id, type, status (OPEN|DONE|CANCELLED), user_id (patient), claim_id, gap_report_id?, gap_finding_id?, file_id?, page?, title, detail, assignee_auth_user_id?, assignee_role?, suggested_reply (json)?, created_by_actor_id, created_at, resolved_by_actor_id?, resolved_at?, note?, reply?, result_file_id?, version` (optimistic lock, like review tasks). Index on `(tenant_id, status, assignee_role)` and `(tenant_id, assignee_auth_user_id, status)`.

`gap_findings` gets `fix_status`, `fixed_by_actor_id`, `fixed_at`, `fix_note`.

## 5. Frontend changes

| File | Change |
|---|---|
| `src/features/tasks/api/tasksApi.js` (re-create) | `list` (N5), `resolve` (N6), `create` (N7). No mock fallback. |
| `src/features/tasks/hooks/useTasks.js` (re-create) | `useTasks`, `useOpenTaskCount` (badge, same cache), `useResolveTask` (invalidates `['tasks']`, `['gapInbox']`), `useCreateTask` |
| `src/features/tasks/components/TaskCard.jsx` (re-create) | Chip per type, document link, action per type (§3), reply textarea for `PAYER_QUERY`, file picker (patient's files newer than the task) for `DOCUMENT`/`RESCAN`. Done cards fade to 65% with "Done by … at HH:mm". |
| `src/features/tasks/pages/MyTodosPage.jsx` | Two tabs: **To do** (tasks, N5) and **Sent-back claims** (today's gap-report inbox). Each gap-report card shows "2 of 3 done". |
| `src/features/tasks/components/GapReportCard.jsx` | Progress (`open_task_count / task_count`), `RESOLVED` chip |
| `src/components/layout/RoleTabs.jsx` | Badge = `open_count` from N5 |
| `src/features/documents/components/DocumentDetail.jsx` | **Request re-scan** (N7, `RESCAN`) for staff and admins |
| `src/features/claim-desk/steps/CheckGapsStep.jsx` | `FIXED` chip on findings (who, when, note) |
| `src/features/claims/pages/ClaimsWorklistPage.jsx` + `statusMaps.js` | `READY_TO_RECHECK` badge |
| `src/constants/doctorFlowApis.js` | Add N5–N7 to the S08 / S05 API panels |

Rules:
- Without `tasks:resolve`: action buttons hidden, reply read-only.
- The doctor never sees amounts, payer details or integrity findings on a task (same rule as S05–S08).
- Every action logs to the activity rail ("completed: Upload the angiogram report").

## 6. Test plan (with `05_approve_submit`)

Test data: `D:\projects\sky_life_360_test_files\05_approve_submit\` (see its README). Users: `admin@hosp.org` / `integrity.admin@hosp.org` (ADMIN), `sashi@hosp.org` (MEMBER), `doctor@hosp.org` (VIEWER, granted `SYN-AS-201…204`).

| # | Steps | Expected |
|---|---|---|
| 1 | Admin: claim 3 (`SUV-261112-03`, no angiogram) → Check gaps → Send back | Gap report + **2 tasks**: `DOCUMENT` "Upload the angiogram report" (staff pool), `DOCUMENT` "Echo, Troponin I/T" (staff pool) |
| 2 | Doctor: My to-dos | Sent-back claims tab shows the report "0 of 2 done". To do tab: none (both go to the staff pool) |
| 3 | Staff (`sashi@hosp.org`): upload `04_gap_check\A_complete_claim\angiogram_report.pdf` renamed for Farah Siddiqui (or a regenerated one) for `SYN-AS-203`; My to-dos → **Uploaded**, pick the file | Task `DONE`, "Done by sashi at …"; report "1 of 2 done" |
| 4 | Staff: resolve the second task with a note | Report `RESOLVED`; worklist shows **READY TO RECHECK** |
| 5 | Admin: open claim 3 → Check gaps | Both gaps show **FIXED** with who/when/note. Re-run Check gaps → the angiogram gap is gone → Integrity → Approve → **SUBMITTED** |
| 6 | Doctor tries to resolve a task for a patient not granted | `404` |
| 7 | Two users resolve the same task | Second gets `409 TASK_ALREADY_RESOLVED`; card refreshes |
| 8 | Claim 4 (duplicate, hard fail) → Send back | Report with `resubmission_allowed = false`, **no tasks**; card says it can't be fixed by the hospital |

## 7. Build order

1. **Backend N5 + N6 + model + migration**, with `tasks:resolve` enforced and tests (scope, 409, side effects on gap finding / report).
2. **Backend hand-off**: Send back creates tasks (§3 mapping); gap report counts; `READY_TO_RECHECK`.
3. **Frontend S08** actions and badge (§5), against the real API.
4. **Backend N7** + S05 Request re-scan.
5. **Admin side**: `FIXED` on Check gaps, worklist badge, re-run guidance.
6. Later (needs the models): `PAYER_QUERY` suggested reply via `/rag/ask`, `SIGNATURE` detection.

## 8. Open questions

| # | Question | Proposal |
|---|---|---|
| 1 | Who sends the doctor's insurer reply to the TPA? | The admin from the claim desk; the reply is stored on the task |
| 2 | Re-check: new claim or same claim? | Same claim ID; Check gaps builds a new packet, the old one stays for audit |
| 3 | Can a doctor reassign a task (e.g. to staff)? | Not in v1 |
| 4 | Does the gap report still need a download for signed-in users? | Yes, separate backend follow-up (`POST /gap-reports/{id}/links` needs a user-bound key today) |
| 5 | Task for the registry's Echo / Troponin gap, which appears on every cardiology claim (backend B-G11)? | Create it, but fix B-G11 first so the gap isn't raised when those reports are uploaded |
