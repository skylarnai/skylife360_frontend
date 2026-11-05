# 03 — Doctor and Staff flow

The clinical side of Sky Claims: doctors and medical records staff find patient documents, ask questions about a patient, see a patient's summary and timeline, and finish the to-dos the claims team sends them. They never see claim amounts, payer details or integrity findings.

## Status

| Screen | Route | Status | Live today | Waiting on |
|---|---|---|---|---|
| [S05 Patient documents](patient_documents_S05.md) | `/documents` (landing) | Built, partly wired | In-document search, page text | N1, N2, N7 |
| [S06 Ask about a patient](ask_patient_S06.md) | `/ask` | Wired | Answers, sources, answer check | N2 (picker) |
| [S07 Patient summary](patient_summary_S07.md) | `/patients/:id` | Built | — | N1–N4 |
| [S08 My to-dos](my_todos_S08.md) | `/todos` | Built | — | N5–N7 |

**Backend work to finish the flow:** [doctor_flow_apis.md](doctor_flow_apis.md) has 7 NEEDED endpoints (N1–N7), with contracts, scoping rules and build order. Until each one ships, its screen uses prototype mock data and shows a "Showing demo …" note. The switch to the real endpoint happens without code changes (`withMockFallback` in `src/services/api/index.js`).

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
src/features/documents/   S05  page, table, detail, filesApi (+ mock)
src/features/rag/pages/   S06  AskPatientPage (reuses features/rag components)
src/features/patients/    S06/S07  picker, summary page, patientsApi (+ mock)
src/features/tasks/       S08  page, TaskCard, tasksApi (+ in-memory mock), badge hook
src/constants/doctorFlowApis.js   dev API panel lists (match doctor_flow_apis.md)
```

## Next steps

1. Backend ships N1 → N2 → N5/N6 → N7 → N3/N4 (order in doctor_flow_apis.md §7).
2. After each one, run that screen's section 12 prompt to remove its mock.
3. Create a `VIEWER` doctor with a few assigned patients, and check scoping end to end (403 outside the care team).
