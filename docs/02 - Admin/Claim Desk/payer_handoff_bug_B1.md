# Bug B1: Approve returns 500 when the claim can't be handed to a payer

| Field | Value |
|---|---|
| For | Backend (`D:\projects\sky_life_360_dev`) |
| File | `app/features/f006_human_validation/handoff.py`, function `after_decision` |
| Endpoint | `POST /api/v1/reviews/{task_id}/adjudicate` (decision `APPROVED` or `FALSE_POSITIVE`) |
| Backend checked | `dev@203f135` |
| Found | 8 Nov 2026, end-to-end test, claim `SUV-261112-01`, approved by `integrity.admin@hosp.org` |
| Severity | **High for the demo**, low for data: nothing is lost, but the user sees "Internal Server Error" |
| Size | Small (about 3 lines + 1 test) |

---

## 1. What happens

| | Expected | Actual |
|---|---|---|
| HTTP response | `200`, the task with `handoff: { "action": "failed", "error_code": "PAYER_NOT_CONFIGURED", "message": "No active payer endpoint is configured for this claim" }` | **`500 Internal Server Error`** |
| Decision | Saved (`ADJUDICATED`, `APPROVED`) | Saved ✅ |
| Hand-off record (`review_handoff_failed` audit event) | Written | **Not written** (`GET /reviews/{id}` → `handoff: null`) |
| Log | `[reviews] task=… | APPROVED -> {action: failed, …}` | Exception trace instead |

The function's own docstring says it "never raises" and "never undoes or fails the decision". The decision is indeed kept; only the hand-off record and the response are lost.

## 2. How to reproduce

1. Make sure no active payer endpoint matches the claim's Payer ID (today `HOSP-001` has none: `submission.cli list-payers --tenant-id HOSP-001` prints nothing).
2. Take a claim to step 6. If its integrity run is `SOFT_WARN`, clear the flags with one admin.
3. Approve with **another** admin (`POST /reviews/{id}/adjudicate`, `decision: APPROVED`).
4. → `500`. Then `GET /reviews/{id}` shows `status: ADJUDICATED`, `decision: APPROVED`, `handoff: null`, and there is no submission.

## 3. Cause

```python
try:
    ...
    sub, endpoint, replayed = await submission.submit_claim(...)   # raises ServiceError(PAYER_NOT_CONFIGURED)
except (submission.ServiceError, ClaimInputsUnavailable) as exc:
    await db.rollback()                 # ← expires every ORM object loaded in the session, including `task`
    result = {"action": "failed", ...}
...
db.add(AuditEvent(tenant_id=task.tenant_id,            # ← reads an expired attribute
                  detail={"review_task_id": task.id,   #   async session can't lazy-load here
                          "packet_id": task.packet_id, ...}))
```

After `rollback()`, reading `task.tenant_id`, `task.id` or `task.packet_id` triggers a lazy reload. On an `AsyncSession` that raises `sqlalchemy.exc.MissingGreenlet`, which isn't caught, so the request returns 500 and the audit event is never committed.

The same happens on **every** failure path of the hand-off: `ServiceError` (no payer, payer inactive, packet not found), `ClaimInputsUnavailable`, and the generic `except Exception` branch. The send-back path (`REJECTED`) worked in testing only because it didn't fail.

## 4. Fix

Copy the values before anything can roll back, and use only the copies afterwards:

```python
async def after_decision(db, request, *, tenant, task, decision, recipients, domain, app_config, storage) -> dict:
    task_id, tenant_id, packet_id = task.id, task.tenant_id, task.packet_id   # before any rollback
    ...
    # every later use: task.id -> task_id, task.tenant_id -> tenant_id, task.packet_id -> packet_id
    db.add(AuditEvent(tenant_id=tenant_id, event_type=f"review_handoff_{result['action']}",
                      detail={"review_task_id": task_id, "packet_id": packet_id, "decision": decision,
                              **{k: v for k, v in result.items() if k != "action"}}))
    await db.commit()
    log("[reviews] task=%s packet=%s | %s -> %s", task_id, packet_id, decision, result)
```

`router.py` (`adjudicate`) builds the response **before** calling `after_decision`, so it needs no change.

## 5. Tests to add

| # | Case | Expected |
|---|---|---|
| 1 | Approve, no payer endpoint for the Payer ID | `200`; `handoff.action == "failed"`, `error_code == "PAYER_NOT_CONFIGURED"`; decision saved; one `review_handoff_failed` audit event |
| 2 | Then `GET /reviews/{id}` | Same `handoff` returned (from the audit event) |
| 3 | Approve, payer endpoint exists but `is_active = false` | Same as 1 |
| 4 | Hand-off raises an unexpected exception (monkeypatch `submit_claim`) | `200`, `error_code == "INTERNAL_ERROR"`, audit event written |
| 5 | Send back (`REJECTED`) where `reject_claim` fails | `200`, `handoff.action == "failed"` |

## 6. Frontend (no change needed)

- Today: step 6 shows the 500 error, then reloads the review. The claim is APPROVED with no hand-off, so it shows **Submit to …**, which answers `422 PAYER_NOT_CONFIGURED` until a payer exists.
- After the fix: step 6 shows "hand-off failed (PAYER_NOT_CONFIGURED)" plus **Submit to …**, which the frontend already supports.
