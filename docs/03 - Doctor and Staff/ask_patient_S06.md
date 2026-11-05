# S06 — Ask about a patient

| Field | Value |
|---|---|
| Screen | S06 — Ask about a patient |
| Role | Doctor (`VIEWER`), Records staff (`MEMBER`), Admin · needs `rag:ask` |
| Route | `/ask?patient=SYN-P-1042` |
| Prototype reference | `viewAsk()`, `ASKQ`, `freeSearch()` |
| Depends on | S03.3 (reuses `features/rag` components) |
| Status | **Wired** (answers are live); the patient picker is mock until N2 |
| API readiness | READY, except N2 `GET /patients` (**NEEDED**) · tab shown only when `VITE_ENABLE_ASK=true` |

## 1. Purpose

Let a doctor pick one of their patients and ask questions in plain words. Answers use only that patient's documents and show where each fact came from.

## 2. Users and permissions

`rag:ask`. A doctor (`VIEWER`) can only ask about assigned patients: the backend returns `403 UNAUTHORIZED_USER` for anyone else. The Ask tab and the S05 "Ask about this patient →" button are hidden unless `VITE_ENABLE_ASK=true`, because answers need an LLM configured on the backend.

## 3. Layout

```
┌ main ──────────────────────────────────────────────────────┐ ┌ rail ──────────────────────┐
│ Ask about a patient                                        │ │ API for this screen (dev)  │
│ [ Showing demo patients … ]              ← only while mock │ │ POST /rag/ask   READY      │
│ Patient [SYN-P-1042 · Laparoscopic cholecystectomy ▾]      │ │ { "query": "…",            │
│ K80.2 · Calculus of gall bladder · Dr. S. Menon. Answers   │ │   "filters": { "user_id":  │
│ use only this patient's documents and show where each      │ │   "SYN-P-1042" } }         │
│ fact came from.                                            │ │ Activity · audit           │
│ (What procedure was done, and when?) (Is the anaesthesia…) │ └────────────────────────────┘
│ [ Type a question, e.g. Was the histopathology… ] [Ask]    │
│ <AnswerBox> <SourcesList> <AnswerCheck>  (same as S03.3)   │
└────────────────────────────────────────────────────────────┘
```

## 4. Content and states

Same answer states as S03.3: thinking, answered, "not in the documents", error with Retry. Suggested questions change with the patient (`SUGGESTED_QUESTIONS_BY_PATIENT` in `patientsApi.mock.js`, with a default set for other patients).

## 5. Interactions

- Changing the patient updates `?patient=` and clears the answer and input (the question panel remounts with `key={patientId}`).
- Coming from S05 "Ask about this patient →" pre-selects the patient.
- Each question logs an activity line: "asked about SYN-P-1042: …".

## 6. APIs

Dev panel list: `ASK_PATIENT_APIS` in `src/constants/doctorFlowApis.js`.

| Method | Path | Tag | Used for |
|---|---|---|---|
| POST | `/api/v1/rag/ask` | READY | `{ query, filters: { user_id }, stream: false }` → `answer, answered, citations[], sources[], generation_id` |
| POST | `/api/v1/evaluation/evaluate` | READY | Answer check after each answer |
| POST | `/api/v1/rag/search` | READY | Ranked passages (not used by the UI yet) |
| GET | `/api/v1/patients?mine=true` | **NEEDED · N2** | Patient picker |

## 7. Data mapping

Answer data as in S03.3. Picker label: `"{user_id} · {procedure_name}"`. Line below it: `"{diagnosis.code} · {diagnosis.name} · {treating_doctor}"`.

## 8. Components

Reused from `features/rag/components`: `QuestionChips`, `AskInput`, `AnswerBox`, `SourcesList`, `AnswerCheck`. Shared with S07: `features/patients/components/PatientPicker.jsx`.

## 9. Files

```
src/features/rag/pages/AskPatientPage.jsx
src/features/patients/api/patientsApi.js       listPatients (N2, mock fallback)
src/features/patients/api/patientsApi.mock.js  4 prototype patients + suggested questions
src/features/patients/hooks/usePatients.js
src/features/patients/components/PatientPicker.jsx
src/features/patients/utils.js                 patientLabel · diagnosisLabel · suggestedQuestionsFor
```

## 10. Acceptance criteria

1. Every request sends `filters.user_id` = the selected patient. ✅
2. Changing the patient resets the answer and the suggested questions. ✅
3. The S05 → S06 link pre-selects the patient. ✅
4. No amounts, payer or integrity data appear. ✅
5. A doctor asking about a patient outside their care team sees the 403 message, not a blank answer. ✅

## 11. Backend gaps and open questions

- **N2** `GET /patients`: until it ships, the picker lists the 4 mock patients. Those IDs only give answers if they have real indexed files in your tenant.
- Optional: suggested questions per procedure from the backend.

## 12. Build prompt for Claude

> Once `GET /api/v1/patients` (N2 in `docs/03 - Doctor and Staff/doctor_flow_apis.md`) ships, remove the mock fallback in `patientsApi.listPatients` and check the picker shows only the doctor's patients. Keep the suggested-question map until the backend provides one. Run lint and build.
