# 03 — Doctor and Staff flow

The clinical side of Sky Claims: doctors and medical records staff find patient documents, ask questions about a patient, see a patient's summary and timeline, and finish the to-dos the claims team sends them. They never see claim amounts, payer details or integrity findings.

## Status

| Screen | Route | Status | Live today | Waiting on |
|---|---|---|---|---|
| [S05 Patient documents](patient_documents_S05.md) | `/documents` (landing) | Wired | List, tiles, filters, page text, Request re-scan (N7) | Search inside the text (models) |
| [S06 Ask about a patient](ask_patient_S06.md) | `/ask` | Hidden | — | The models (`VITE_ENABLE_CLINICAL_ASK=true` shows it) |
| [S07 Patient summary](patient_summary_S07.md) | `/patients/:id` | Wired | Header (N3), documents (N1) | Timeline (N4, models) |
| [S08 My to-dos](my_todos_S08.md) | `/todos` | Wired | To do (N5, N6, upload) · Sent-back claims (gap reports with progress) | Report download (backend) |

**Acting on to-dos (N5–N7):** built in backend `49913f8` and wired. [todo_actions_final_step.md](todo_actions_final_step.md) has the design and test plan; [end_to_end_claim_flow.md](../end_to_end_claim_flow.md) §8a has the steps.

**APIs:** [doctor_flow_apis.md](doctor_flow_apis.md). No screen uses mock data any more.

## Roles

| Backend role | Shown as | Patients | Notable permissions |
|---|---|---|---|
| `VIEWER` | Doctor | Only those granted with `grant-user-access` | `docs:read`, `rag:ask`, `tasks:resolve` |
| `MEMBER` | Records staff | Whole hospital | as above + `files:upload`, `claims:intake` |

At sign-in, choose **Doctor / Staff** under "I'm signing in as". If the account's role doesn't match the choice, sign-in stops with a message. Neither role gets an MFA prompt. To create these accounts, see [../01 - Auth/auth_user_setup.md](../01%20-%20Auth/auth_user_setup.md) §2 and §6.

## Switches

| Setting | Where | Effect |
|---|---|---|
| `DOCTOR_PANEL_ENABLED` | `src/constants/navigation.js` | Turns the whole flow on or off: routes, tabs, the login option. Currently `true`. |
| `VITE_ENABLE_ASK` | frontend `.env` | Shows the Ask tab and the S05 "Ask about this patient →" button (needs an LLM on the backend) |
| `VITE_SHOW_API_PANEL` | frontend `.env` | Shows the dev "API for this screen" panel. Its lists live in `src/constants/doctorFlowApis.js`. |

## Code map

```
src/features/documents/   S05  page, table, detail (Request re-scan), filesApi
src/features/rag/pages/   S06  AskPatientPage (reuses features/rag components)
src/features/patients/    S06/S07  picker, summary page, patientsApi
src/features/tasks/       S08  page (two tabs), TaskCard, GapReportCard, tasksApi, gapInboxApi, badge hook
src/constants/doctorFlowApis.js   dev API panel lists (match doctor_flow_apis.md)
```

## Next steps

1. Run the send-back test in [end_to_end_claim_flow.md](../end_to_end_claim_flow.md) §8a against the live backend.
2. Backend follow-ups: gap report download for signed-in users; optionally re-run Check gaps on `READY_TO_RECHECK`.
3. Later, with the models: Ask (S06), search inside documents, the S07 timeline, the suggested insurer reply.
