---
name: Fase 1 audit state
description: Closed outcome of the Fase 1 audit and the non-obvious facts later phases must preserve.
---

The Fase 1 audit initially returned **CON CAMBIOS**. Its five blocking corrections were closed on 2026-09-14. Full reports: `docs/auditorias/2026-09-14-fase-1.md` and `docs/auditorias/2026-09-14-fase-1-correcciones.md`.

**Why:** these are conclusions that cost real investigation to reach; re-deriving them in a later phase wastes the work and risks contradicting a decision that was already made deliberately.

**How to apply:**

- **The RFC modulo-11 algorithm is correct.** Verified against real SAT-issued RFCs (`CFE370814QI0`, `SAT970701NN3`, `LAN7008173R5`, `AME880912I89`, `MASO451221PM4`). When a test workbook fails en masse, the data is synthetic with random homoclaves, not the validator. Do not "fix" the algorithm. Generic RFCs (`XAXX010101000`, `XEXX010101000`) are rejected on purpose: a padrón producer must never carry one.
- **Six district values were observed in the audited padrón**, but they remain a proposed catalog until Driscoll's confirms them officially. Do not enable the environment variable based only on observation.
- **A public lockfile does not guarantee `npm ci` can run inside Replit.** Replit's package firewall blocks the pinned Next.js 14 release because of its critical CVE even when every lockfile URL is public. Validate clean installation outside Replit or after the separately scoped framework upgrade.
- **Phone numbers are stored normalized** to exactly 10 digits, and the workbook's physical row numbers now flow through the service, `lib/db` and the route as `rowNumbers`. Never reintroduce `index + 2`.
- **`/reports` is deferred behind `STAGE_2_ENABLED`, not reconnected.** It still compiles `lib/data/demoData` (2022 demo figures). Enabling the flag publishes fictional financials as if real.

Related: [[zona-distrito-semantics]]
