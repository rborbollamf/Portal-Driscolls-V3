---
name: Reliable monitoring concurrency
description: Safety rules for queued monitoring, retries, and alert effects across multiple workers.
---

Monitoring requests must preserve one idempotency key across transport retries, and every validation write must be committed only while the worker still owns its fenced lease.

**Why:** A repeated scheduler delivery can otherwise create an entire duplicate monitoring batch. A slow or recovered worker can also overwrite a newer attempt after its lease expires, producing stale financial data or alert transitions.

**How to apply:** Keep the request key stable from the scheduler through entity/type jobs. For any future monitoring effect, verify the job's current worker and claim token inside the same transaction that writes the effect and completes the job. Rate limits must remain shared across workers, not held in process memory.