---
name: Fase 1 audit state
description: Outcome of the Fase 1 audit, the five blocking findings, and the facts every later phase must not re-derive.
---

The Fase 1 audit (range `base-fase-1..fase-1.1-validaciones-import`, 2026-09-14) returned **CON CAMBIOS**: nine acceptance criteria implemented, seven clean, one with a reservation, one partial. Five findings block the phase from closing. Full report: `docs/auditorias/2026-09-14-fase-1.md`.

**Why:** these are conclusions that cost real investigation to reach; re-deriving them in a later phase wastes the work and risks contradicting a decision that was already made deliberately.

**How to apply:**

- **The RFC modulo-11 algorithm is correct.** Verified against real SAT-issued RFCs (`CFE370814QI0`, `SAT970701NN3`, `LAN7008173R5`, `AME880912I89`, `MASO451221PM4`). When a test workbook fails en masse, the data is synthetic with random homoclaves, not the validator. Do not "fix" the algorithm. Generic RFCs (`XAXX010101000`, `XEXX010101000`) are rejected on purpose: a padrón producer must never carry one.
- **The real district catalog has six values**, not three: `Jalisco,Puebla,Guanajuato,Colima,Michoacan,Altos - Bajio`. Defining `PRODUCER_IMPORT_DISTRICTS` turns any district outside the list into a blocking error, so an incomplete value silently rejects over half the padrón.
- **`Grower #` collisions are not handled at write time.** `producers_grower_number_uq` exists (migration 006) but the upsert only declares `ON CONFLICT` on the RFC index, and the pre-flight check is outside the write transaction. This is the open half of acceptance criterion (i).
- **The committed `package-lock.json` only installs inside Replit** — 139 `resolved` URLs point at `package-firewall.replit.*`. Any work on containers, CI or AWS hits this first.
- **Phone numbers are stored normalized** to exactly 10 digits, and the workbook's physical row numbers now flow through the service, `lib/db` and the route as `rowNumbers`. Never reintroduce `index + 2`.
- **`/reports` is deferred behind `STAGE_2_ENABLED`, not reconnected.** It still compiles `lib/data/demoData` (2022 demo figures). Enabling the flag publishes fictional financials as if real.

Related: [[zona-distrito-semantics]]
